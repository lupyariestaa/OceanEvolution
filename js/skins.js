// skins.js V3 — fish skin definitions
export const SKINS = [
  { id:'default',   name:'Ocean Blue',   price:0,    color:'#4fc3f7', fin:'#29b6f6', glow:null,         description:'Classic ocean blue' },
  { id:'sunset',    name:'Sunset',        price:150,  color:'#ff7043', fin:'#e64a19', glow:'#ff5722',    description:'Warm sunset tones' },
  { id:'midnight',  name:'Midnight',      price:200,  color:'#1a237e', fin:'#0d47a1', glow:'#7c4dff',    description:'Deep midnight blue' },
  { id:'toxic',     name:'Toxic Green',   price:180,  color:'#76ff03', fin:'#64dd17', glow:'#76ff03',    description:'Radioactive green' },
  { id:'pink',      name:'Sakura',        price:160,  color:'#f48fb1', fin:'#e91e63', glow:'#e91e63',    description:'Cherry blossom pink' },
  { id:'gold',      name:'Golden',        price:350,  color:'#ffd740', fin:'#ffa000', glow:'#ffd740',    description:'Shining gold' },
  { id:'ghost',     name:'Ghost',         price:280,  color:'#e0e0e0', fin:'#9e9e9e', glow:'#ffffff',    description:'Ethereal white' },
  { id:'lava',      name:'Lava',          price:300,  color:'#bf360c', fin:'#870000', glow:'#ff3d00',    description:'Burning lava red' },
  { id:'galaxy',    name:'Galaxy',        price:500,  color:'#7c4dff', fin:'#4527a0', glow:'#e040fb',    description:'Cosmic purple' },
  { id:'rainbow',   name:'Rainbow',       price:750,  color:'#ff1744', fin:'#00e5ff', glow:'#fff176',    description:'All colors at once!' },
];

export function getSkin(id){ return SKINS.find(s=>s.id===id) || SKINS[0]; }
