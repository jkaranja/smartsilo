DO $$ DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'TenantMembership','AuditLog','File',
    'GarageCustomer','GarageVehicle','GaragePartsInventory',
    'GarageWorkOrder','GaragePurchaseOrder',
    'ClinicPatient','ClinicMedication','ClinicAppointment',
    'DealerVehicleListing','DealerSalesDeal','DealerTradeIn'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('
      DROP POLICY IF EXISTS tenant_isolation ON %I;
      CREATE POLICY tenant_isolation ON %I
        USING ("tenantId" = current_setting(''app.current_tenant'')::uuid)
    ', tbl, tbl);
  END LOOP;
END $$;
