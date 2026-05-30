import type { KyselyContext } from '@saas/db'
import type { ListVehicles, GetVehicle, CreateVehicle, UpdateVehicle } from '../../lib'

export const list   = async (db: KyselyContext, input: ListVehicles) => []

export const get    = async (db: KyselyContext, input: GetVehicle) => null

export const create = async (db: KyselyContext, input: CreateVehicle) => null

export const update = async (db: KyselyContext, input: UpdateVehicle) => null

export default { list, get, create, update }
