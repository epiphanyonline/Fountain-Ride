import 'server-only'

type DriverLike={
  id:string
  driver_type?:string|null
  verification_status?:string|null
  is_available?:boolean|null
  accept_unverified_riders?:boolean|null
  park_id?:string|null
  home_state?:string|null
  current_lat?:number|null
  current_lng?:number|null
}

type RideLike={
  id:string
  ride_type?:string|null
  commercial_mode?:string|null
  rider_verified?:boolean|null
  requested_park_id?:string|null
  requested_driver_application_id?:string|null
  pickup_state?:string|null
  pickup_lat?:number|null
  pickup_lng?:number|null
  status?:string|null
}

export function kmBetween(aLat:number,aLng:number,bLat:number,bLng:number){
  const r=6371,dLat=(bLat-aLat)*Math.PI/180,dLng=(bLng-aLng)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2
  return 2*r*Math.asin(Math.sqrt(a))
}

export function driverCanSeeRide(driver:DriverLike,ride:RideLike,opts?:{invited?:boolean;parkState?:string|null;quickMatchRadiusKm?:number}){
  if(driver.verification_status!=='approved'||driver.is_available===false)return false
  if(ride.ride_type&&driver.driver_type&&ride.ride_type!==driver.driver_type)return false
  if(!ride.rider_verified&&!driver.accept_unverified_riders)return false
  if(ride.requested_driver_application_id&&ride.requested_driver_application_id!==driver.id&&!opts?.invited)return false

  if(ride.ride_type==='commercial'){
    if(ride.commercial_mode==='garage'){
      if(ride.requested_park_id&&driver.park_id!==ride.requested_park_id&&!opts?.invited)return false
      return true
    }
    if(ride.commercial_mode==='quick_match'){
      const hasCoords=driver.current_lat!=null&&driver.current_lng!=null&&ride.pickup_lat!=null&&ride.pickup_lng!=null
      if(hasCoords){
        const radius=opts?.quickMatchRadiusKm??120
        return kmBetween(Number(driver.current_lat),Number(driver.current_lng),Number(ride.pickup_lat),Number(ride.pickup_lng))<=radius
      }
      // When map coordinates are not available yet, keep quick match usable.
      // Same-state drivers sort first in the dashboard, but other approved
      // commercial drivers can still see the request and decide whether to quote.
      return true
    }
  }

  // Private drivers use a local-market fallback until live coordinates are available.
  if(ride.ride_type==='private'){
    if(driver.current_lat!=null&&driver.current_lng!=null&&ride.pickup_lat!=null&&ride.pickup_lng!=null){
      return kmBetween(Number(driver.current_lat),Number(driver.current_lng),Number(ride.pickup_lat),Number(ride.pickup_lng))<=120
    }
    return !driver.home_state||!ride.pickup_state||driver.home_state===ride.pickup_state
  }

  return true
}
