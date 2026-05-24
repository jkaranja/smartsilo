import { withTenant } from '@saas/db'

export class GarageService {
  constructor(
    private tenantId: string,
    private connectionKey: string,
  ) {}

  async checkPartStock(sku: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('garage_parts_inventory')
        .selectAll()
        .where('sku', '=', sku)
        .executeTakeFirst()
    })
  }

  async listLowStockParts() {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('garage_parts_inventory')
        .selectAll()
        .whereRef('quantity', '<=', 'reorder_point')
        .execute()
    })
  }

  async adjustPartStock(sku: string, delta: number, reason?: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .updateTable('garage_parts_inventory')
        .set((eb) => ({ quantity: eb('quantity', '+', delta) }))
        .where('sku', '=', sku)
        .returningAll()
        .executeTakeFirst()
    })
  }

  async createPurchaseOrder(sku: string, quantity: number, urgency = 'standard') {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .insertInto('garage_purchase_orders')
        .values({
          id: crypto.randomUUID(),
          tenant_id: this.tenantId,
          sku,
          quantity,
          urgency,
          status: 'PENDING',
        })
        .returningAll()
        .executeTakeFirst()
    })
  }

  async listWorkOrders(status?: string, limit = 50) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      let query = db
        .selectFrom('garage_work_orders as wo')
        .innerJoin('garage_vehicles as v', 'v.id', 'wo.vehicle_id')
        .select([
          'wo.id',
          'wo.tenant_id',
          'wo.vehicle_id',
          'wo.assigned_to',
          'wo.status',
          'wo.description',
          'wo.labour_hours',
          'wo.total_cost',
          'wo.opened_at',
          'wo.closed_at',
          'v.make',
          'v.model',
          'v.year',
        ])
        .limit(limit)
        .orderBy('wo.opened_at', 'desc')

      if (status) {
        query = query.where('wo.status', '=', status)
      }

      return query.execute()
    })
  }

  async getWorkOrder(id: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('garage_work_orders as wo')
        .innerJoin('garage_vehicles as v', 'v.id', 'wo.vehicle_id')
        .select([
          'wo.id',
          'wo.tenant_id',
          'wo.vehicle_id',
          'wo.assigned_to',
          'wo.status',
          'wo.description',
          'wo.labour_hours',
          'wo.total_cost',
          'wo.opened_at',
          'wo.closed_at',
          'v.make',
          'v.model',
          'v.year',
        ])
        .where('wo.id', '=', id)
        .executeTakeFirst()
    })
  }

  async createWorkOrder(vehicleId: string, description?: string, assignedTo?: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .insertInto('garage_work_orders')
        .values({
          id: crypto.randomUUID(),
          tenant_id: this.tenantId,
          vehicle_id: vehicleId,
          status: 'OPEN',
          ...(description !== undefined && { description }),
          ...(assignedTo !== undefined && { assigned_to: assignedTo }),
        })
        .returningAll()
        .executeTakeFirst()
    })
  }

  async updateWorkOrder(
    id: string,
    updates: { status?: string; description?: string; assigned_to?: string; labour_hours?: number },
  ) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .updateTable('garage_work_orders')
        .set(updates)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    })
  }

  async closeWorkOrder(id: string, totalCost?: number, labourHours?: number) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .updateTable('garage_work_orders')
        .set({
          status: 'CLOSED',
          closed_at: new Date(),
          ...(totalCost !== undefined && { total_cost: totalCost }),
          ...(labourHours !== undefined && { labour_hours: labourHours }),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    })
  }

  async listCustomers(limit = 50) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('garage_customers')
        .selectAll()
        .limit(limit)
        .orderBy('created_at', 'desc')
        .execute()
    })
  }

  async listVehicles(customerId?: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      let query = db.selectFrom('garage_vehicles').selectAll()

      if (customerId) {
        query = query.where('customer_id', '=', customerId)
      }

      return query.orderBy('created_at', 'desc').execute()
    })
  }
}
