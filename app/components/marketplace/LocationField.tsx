'use client'
import {useEffect,useRef,useState} from 'react'

type LocationValue={address:string;lat:number|null;lng:number|null}
type Prediction={text:string;prediction:any}

declare global { interface Window { google:any } }

let googleLoader:Promise<void>|null=null
function loadGoogle(key:string){
 if(typeof window==='undefined')return Promise.reject(new Error('Browser only'))
 if(window.google?.maps?.importLibrary)return Promise.resolve()
 if(googleLoader)return googleLoader
 googleLoader=new Promise((resolve,reject)=>{
  const old=document.querySelector('script[data-fountain-google-maps]') as HTMLScriptElement|null
  if(old){old.addEventListener('load',()=>resolve(),{once:true});old.addEventListener('error',()=>reject(new Error('Google Maps failed to load')),{once:true});return}
  const s=document.createElement('script');s.dataset.fountainGoogleMaps='1';s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=places&v=weekly`;s.async=true;s.defer=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Google Maps failed to load'));document.head.appendChild(s)
 })
 return googleLoader
}

export default function LocationField({label,value,onChange,placeholder,compact=false}:{label:string;value:LocationValue;onChange:(v:LocationValue)=>void;placeholder?:string;compact?:boolean}){
 const boxRef=useRef<HTMLLabelElement>(null),tokenRef=useRef<any>(null),requestRef=useRef(0)
 const [focused,setFocused]=useState(false),[ready,setReady]=useState(false),[loading,setLoading]=useState(false),[locating,setLocating]=useState(false),[predictions,setPredictions]=useState<Prediction[]>([]),[mapError,setMapError]=useState('')
 const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''
 useEffect(()=>{const close=(e:MouseEvent)=>{if(!boxRef.current?.contains(e.target as Node))setFocused(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[])
 useEffect(()=>{if(!key){setMapError('Address search is not configured.');return}loadGoogle(key).then(async()=>{await window.google.maps.importLibrary('places');setReady(true)}).catch(()=>setMapError('Address suggestions could not be loaded.'))},[key])
 useEffect(()=>{
  const input=value.address.trim();if(!ready||input.length<2){setPredictions([]);return}
  const id=++requestRef.current;const timer=setTimeout(async()=>{try{
   setLoading(true);const {AutocompleteSessionToken,AutocompleteSuggestion}=await window.google.maps.importLibrary('places');if(!tokenRef.current)tokenRef.current=new AutocompleteSessionToken()
   const {suggestions}=await AutocompleteSuggestion.fetchAutocompleteSuggestions({input,sessionToken:tokenRef.current,region:'ng',language:'en'})
   if(id!==requestRef.current)return
   setPredictions((suggestions||[]).filter((s:any)=>s.placePrediction).slice(0,6).map((s:any)=>({text:s.placePrediction.text.toString(),prediction:s.placePrediction})))
  }catch{if(id===requestRef.current)setPredictions([])}finally{if(id===requestRef.current)setLoading(false)}},220)
  return()=>clearTimeout(timer)
 },[value.address,ready])
 async function selectPrediction(item:Prediction){try{const place=item.prediction.toPlace();await place.fetchFields({fields:['displayName','formattedAddress','location']});onChange({address:place.formattedAddress||place.displayName||item.text,lat:place.location?.lat?.()??null,lng:place.location?.lng?.()??null});tokenRef.current=null;setPredictions([]);setFocused(false)}catch{onChange({address:item.text,lat:null,lng:null});setFocused(false)}}
 function useCurrent(){if(!navigator.geolocation)return;setLocating(true);navigator.geolocation.getCurrentPosition(async p=>{let address='Current location';try{if(ready){const {Geocoder}=await window.google.maps.importLibrary('geocoding');const result=await new Geocoder().geocode({location:{lat:p.coords.latitude,lng:p.coords.longitude}});address=result.results?.[0]?.formatted_address||address}}catch{}onChange({address,lat:p.coords.latitude,lng:p.coords.longitude});setLocating(false);setFocused(false)},()=>setLocating(false),{enableHighAccuracy:true,timeout:10000})}
 return <label className="block relative" ref={boxRef}><span className={compact?'text-[11px] font-black text-gray-500':'text-sm font-black text-gray-800'}>{label}</span><div className={`${compact?'mt-1':'mt-2'} flex gap-2 relative`}><div className="relative flex-1"><input className={compact?'block w-full outline-none font-black bg-transparent':'input flex-1'} value={value.address} onFocus={()=>setFocused(true)} onChange={e=>{onChange({address:e.target.value,lat:null,lng:null});setFocused(true)}} placeholder={placeholder} autoComplete="off"/>{focused&&value.address.trim().length>=2&&<div className="absolute z-[70] left-0 right-0 top-[calc(100%+.4rem)] rounded-2xl border bg-white text-gray-950 shadow-2xl overflow-hidden">{loading&&<div className="px-4 py-3 text-sm text-gray-500">Searching addresses…</div>}{!loading&&predictions.map((p,i)=><button type="button" key={`${p.text}-${i}`} onClick={()=>selectPrediction(p)} className="w-full text-left px-4 py-3 text-sm hover:bg-purple-50 border-b last:border-b-0"><span className="font-black text-purple-700">⌖</span> {p.text}</button>)}{!loading&&ready&&predictions.length===0&&<div className="px-4 py-3 text-sm text-gray-500">Keep typing for an address or landmark.</div>}</div>}</div>{!compact&&<button type="button" onClick={useCurrent} className="shrink-0 rounded-2xl border bg-white px-4 font-bold text-sm hover:bg-purple-50">{locating?'Locating…':'◎ My location'}</button>}</div>{mapError&&<span className="mt-2 block text-[11px] text-amber-700">{mapError}</span>}</label>
}
