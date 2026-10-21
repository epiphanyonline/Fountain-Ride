export type DriverType = 'private' | 'commercial'
export type RideStatus = 'requested'|'negotiating'|'fare_agreed'|'awaiting_payment'|'confirmed'|'driver_en_route'|'driver_arrived'|'in_progress'|'awaiting_rider_confirmation'|'completed'|'cancelled_by_rider'|'cancelled_by_driver'|'expired'|'disputed'|'refunded'

export const NIGERIA_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','FCT Abuja']

export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
}

export function bookingRef() {
  return `FR-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
}
