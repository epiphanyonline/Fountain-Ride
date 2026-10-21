'use client'
import {useEffect,useState} from 'react'
const cards=[
 {city:'Ìbàdàn · Oyo',native:'Ẹ káàbọ̀ sí Ìbàdàn.',line:'From Dugbe to Bodija, Iwo Road to Akobo — move with confidence.',accent:'The city of brown roofs. Our first home.'},
 {city:'Èkó · Lagos',native:'Ẹ káàbọ̀ sí Èkó.',line:'Airport runs, island meetings and family journeys — one ride at a time.',accent:'Energy, enterprise and movement.'},
 {city:'Enugu · Enugu',native:'Nnọọ.',line:'Connecting neighbourhoods, families and inter-city journeys.',accent:'Coal City warmth on the move.'},
 {city:'Kano · Kano',native:'Barka da zuwa.',line:'Local knowledge, trusted drivers and journeys planned ahead.',accent:'Commerce, heritage and hospitality.'},
 {city:'Calabar · Cross River',native:'Welcome.',line:'A celebration of hospitality, culture and connected journeys.',accent:'Many cultures. One Nigeria.'},
]
export default function CultureCarousel(){const [i,setI]=useState(0);useEffect(()=>{const t=setInterval(()=>setI(v=>(v+1)%cards.length),4500);return()=>clearInterval(t)},[]);const c=cards[i];return <div className="relative overflow-hidden rounded-[2rem] bg-gray-950 text-white p-6 md:p-8 min-h-[260px]"><div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-purple-600/30 blur-2xl"/><p className="text-xs font-black tracking-[.2em] text-purple-300">CULTURE IN MOTION</p><p className="text-sm text-gray-400 mt-5">{c.city}</p><h3 key={c.native} className="fr-reveal text-3xl md:text-4xl font-black mt-2">{c.native}</h3><p className="text-gray-300 mt-4 max-w-lg">{c.line}</p><p className="font-black mt-5">{c.accent}</p><div className="flex gap-1.5 mt-7">{cards.map((_,n)=><button aria-label={`Culture card ${n+1}`} key={n} onClick={()=>setI(n)} className={`h-2 rounded-full transition-all ${n===i?'w-8 bg-purple-400':'w-2 bg-white/30'}`}/>)}</div></div>}
