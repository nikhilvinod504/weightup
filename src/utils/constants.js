// ── Palette ────────────────────────────────────────────────────────────────
export const P = { 50:"#EEEDFE",100:"#CECBF6",200:"#AFA9EC",400:"#7F77DD",600:"#534AB7",800:"#3C3489",900:"#26215C" }
export const T = { 50:"#E1F5EE",100:"#9FE1CB",400:"#1D9E75",600:"#0F6E56",800:"#085041" }
export const A = { 50:"#FAEEDA",100:"#FAC775",400:"#BA7517",600:"#854F0B" }
export const C = { 50:"#FAECE7",100:"#F5C4B3",400:"#D85A30",600:"#993C1D" }
export const PK= { 50:"#FBEAF0",400:"#D4537E" }

// ── Levels ─────────────────────────────────────────────────────────────────
export const LEVELS = [
  { name:"Rookie",   min:0,    icon:"🌱", color:P[400] },
  { name:"Climber",  min:200,  icon:"🔼", color:T[400] },
  { name:"Warrior",  min:500,  icon:"⚔️",  color:A[400] },
  { name:"Champion", min:1000, icon:"🏆", color:C[400] },
  { name:"Legend",   min:2000, icon:"👑", color:P[600] },
]

// ── Badges ─────────────────────────────────────────────────────────────────
export const ALL_BADGES = [
  { id:"first_log",    icon:"⚖️", name:"First step",    desc:"Logged your first weight",    check:(l,s)=>l.length>=1 },
  { id:"week_streak",  icon:"🔥", name:"Week warrior",  desc:"7-day logging streak",         check:(l,s)=>s>=7 },
  { id:"month_streak", icon:"🌟", name:"Month master",  desc:"30-day logging streak",        check:(l,s)=>s>=30 },
  { id:"first_kg",     icon:"💪", name:"First kilo",    desc:"Lost your first kg",           check:(l)=>l.length>=2&&(l[0].w-l[l.length-1].w)>=1 },
  { id:"five_kg",      icon:"🏅", name:"5kg crusher",   desc:"Lost 5kg total",               check:(l)=>l.length>=2&&(l[0].w-l[l.length-1].w)>=5 },
  { id:"ten_kg",       icon:"👑", name:"10kg royalty",  desc:"Lost 10kg total",              check:(l)=>l.length>=2&&(l[0].w-l[l.length-1].w)>=10 },
  { id:"consistent",   icon:"📅", name:"Consistent",    desc:"Logged 20 times",              check:(l)=>l.length>=20 },
  { id:"goal_reached", icon:"🎯", name:"Goal getter",   desc:"Reached your target weight",   check:(l,s,g)=>g&&l.length>0&&l[l.length-1].w<=g },
]

// ── Challenges ─────────────────────────────────────────────────────────────
export const CHALLENGES = [
  { id:"c1", name:"Log 7 days straight",     xp:100, icon:"🔥" },
  { id:"c2", name:"Log every day this week", xp:75,  icon:"📅" },
  { id:"c3", name:"Lose 0.5kg this month",   xp:150, icon:"📉" },
  { id:"c4", name:"Share a milestone",       xp:50,  icon:"📣" },
  { id:"c5", name:"Cheer a teammate",        xp:30,  icon:"👏" },
]
