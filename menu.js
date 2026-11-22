// Elenco dei menù e navigazione
import { S } from './schema.js';
import { $ } from './util.js';
import { dash } from './views-dashboard.js';
import { depositsView } from './views-deposits.js';
import { dues } from './views-dues.js';
import { list } from './views-entities.js';
import { finance } from './views-finance.js';
import { report } from './views-report.js';
import { cloudView } from './views-settings.js';

export const V = {dash:['Dashboard',()=>dash()],dues:['Canoni',()=>dues()],expenses:[S.expenses[0],()=>list('expenses')],report:['Report',()=>report()],finance:['Finanza',()=>finance()],deposits:['Caparre',()=>depositsView()],contracts:[S.contracts[0],()=>list('contracts')],apartments:[S.apartments[0],()=>list('apartments')],rooms:[S.rooms[0],()=>list('rooms')],tenants:[S.tenants[0],()=>list('tenants')],cloud:['Impostazioni',()=>cloudView()]};
export function nav(){$('#nav').innerHTML=Object.entries(V).map(([k,v])=>`<button data-k=${k}>${v[0]}</button>`).join('')+'<button id=bk>Backup</button>'}
