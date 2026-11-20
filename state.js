// Stato condiviso dell'applicazione (variabili modificabili)
import { thisM } from './util.js';

export const st = {
  APC: {},
  APN: '#2563eb',
  DCOLL: {},
  DM: undefined,
  CURK: 'dash',
  DB: undefined,
  curM: thisM(),
  LASTREP: null,
};

export const SORT = {dues:null,expenses:null};
export const SYNC = {busy:0,timer:null,state:'off',msg:'',asked:0,pulled:0,again:0};
try{st.DCOLL=JSON.parse(localStorage.dashColl||'{}')}catch{}
