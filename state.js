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
  FY: undefined,
  FSIM: false,
  FIND: false,
  CALCO: false,
  CALC: null,
  SHOWPROS: false,
  FM: 0,
  EM: undefined,
  DACT: false,
  PVC: false,
};

export const SORT = {dues:null,expenses:null,deposits:null,contracts:null,apartments:null,rooms:null,tenants:null,finance:null,finrooms:null};
export const SYNC = {busy:0,timer:null,state:'off',msg:'',asked:0,pulled:0,again:0};
try{st.DCOLL=JSON.parse(localStorage.dashColl||'{}')}catch{}
