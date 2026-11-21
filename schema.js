// Definizione di tabelle, campi, obblighi e legami
export const TABLES = ['apartments','rooms','tenants','contracts','rent_dues','payments','expense_types','expenses','allocations','allocation_shares','share_payments','deposit_moves','documents'];
export const COLS = {apartments:'name,color,address,city,rooms,beds,description,notes',rooms:'apartment_id,name,beds,sqm',tenants:'first_name,last_name,tax_code,phone,email,notes',
 contracts:'tenant_id,apartment_id,room_id,start_date,end_date,monthly_rent,deposit,due_day,notes',payments:'due_id,paid_on,amount,method,notes',
 expenses:'apartment_id,type_id,description,amount,landlord_amount,spent_on,period_from,period_to,supplier,notes',expense_types:'name',share_payments:'share_id,paid_on,amount,method,notes',deposit_moves:'contract_id,kind,moved_on,amount,method,notes,to_contract_id'};
export const REQ = {apartments:['name','address','city'],rooms:['apartment_id','name'],tenants:['first_name','last_name'],contracts:['tenant_id','apartment_id','start_date','monthly_rent'],
 payments:['due_id','paid_on','amount'],expenses:['apartment_id','spent_on','period_from','period_to'],expense_types:['name'],share_payments:['share_id','paid_on','amount'],deposit_moves:['contract_id','kind','moved_on','amount']};
export const NUM = ['rooms','beds','sqm','landlord_amount','monthly_rent','deposit','due_day','amount'];
export const FK = {tenants:[['contracts','tenant_id']],apartments:[['contracts','apartment_id'],['expenses','apartment_id']],expense_types:[['expenses','type_id']],rooms:[['contracts','room_id']]};
export const CAS = {contracts:[['rent_dues','contract_id']],rent_dues:[['payments','due_id']],expenses:[['allocations','expense_id'],['documents','expense_id']],allocations:[['allocation_shares','allocation_id']],apartments:[['rooms','apartment_id']]};
export const R = {apartments:r=>r.name,tenants:r=>r.first_name+' '+r.last_name,expense_types:r=>r.name,rooms:r=>r.name};
const A = ['apartment_id','Appartamento','ref:apartments'];
export const S = {apartments:['Appartamenti',[['name','Nome'],['color','Colore','color'],['address','Indirizzo'],['city','Città'],['rooms','Camere','number'],['beds','Posti letto','number'],['description','Descrizione'],['notes','Note']]],
 tenants:['Inquilini',[['first_name','Nome'],['last_name','Cognome'],['tax_code','Codice fiscale'],['phone','Telefono','tel'],['email','Email','email'],['notes','Note']]],
 rooms:['Camere',[A,['name','Camera'],['beds','Posti letto','number'],['sqm','Mq','number']]],
 contracts:['Contratti',[['tenant_id','Inquilino','ref:tenants'],A,['room_id','Camera','ref:rooms'],['start_date','Ingresso','date'],['end_date','Uscita','date'],['monthly_rent','Canone €','number'],['deposit','Caparra €','number'],['due_day','Giorno scadenza','number'],['notes','Note']]],
 expenses:['Spese',[A,['type_id','Tipologia','ref:expense_types'],['description','Descrizione'],['amount','Importo per inquilini €','number'],['landlord_amount','Importo locatore €','number'],['spent_on','Scadenza','date'],['period_from','Competenza dal','date'],['period_to','Competenza al','date'],['supplier','Fornitore'],['notes','Note']]]};
