import 'server-only'

type DriverReputation = {
  average_rating: number
  review_count: number
  completed_trips: number
  breakdown: {
    punctuality: number
    safety: number
    vehicle: number
    communication: number
    professionalism: number
  }
}

export async function getDriverReputation(
  db: any,
  driverIds: string[]
) {
  const ids = Array.from(new Set(driverIds.filter(Boolean)))

  const result: Record<string, DriverReputation> = {}

  for (const id of ids) {
    result[id] = {
      average_rating: 0,
      review_count: 0,
      completed_trips: 0,
      breakdown: {
        punctuality: 0,
        safety: 0,
        vehicle: 0,
        communication: 0,
        professionalism: 0,
      },
    }
  }

  if (!ids.length) return result

  /*
   * Published rider reviews
   */
  const { data: reviews, error: reviewsError } = await db
    .from('ride_reviews')
    .select(
      `
        driver_application_id,
        rating,
        punctuality_rating,
        safety_rating,
        vehicle_rating,
        communication_rating,
        professionalism_rating
      `
    )
    .in('driver_application_id', ids)
    .eq('review_status', 'published')

  if (reviewsError) {
    console.error('Unable to load driver reviews:', reviewsError)
  }

  const buckets: Record<string, any[]> = {}

  for (const review of reviews || []) {
    if (!review.driver_application_id) continue

    if (!buckets[review.driver_application_id]) {
      buckets[review.driver_application_id] = []
    }

    buckets[review.driver_application_id].push(review)
  }

  for (const id of ids) {
    const rows = buckets[id] || []

    if (!rows.length) continue

    const average = (key: string) => {
      const values = rows
        .map((row) => Number(row[key]))
        .filter((value) => Number.isFinite(value) && value > 0)

      if (!values.length) return 0

      return Number(
        (
          values.reduce((sum, value) => sum + value, 0) /
          values.length
        ).toFixed(1)
      )
    }

    result[id].average_rating = average('rating')
    result[id].review_count = rows.length

    result[id].breakdown = {
      punctuality: average('punctuality_rating'),
      safety: average('safety_rating'),
      vehicle: average('vehicle_rating'),
      communication: average('communication_rating'),
      professionalism: average('professionalism_rating'),
    }
  }

  /*
   * Completed Fountain Ride trips
   *
   * A completed trip belongs to a driver through its accepted offer.
   */
  const { data: acceptedOffers, error: offersError } = await db
    .from('ride_offers')
    .select('id,driver_application_id')
    .in('driver_application_id', ids)
    .eq('status', 'accepted')

  if (offersError) {
    console.error('Unable to load accepted offers:', offersError)
  }

  const offerIds = (acceptedOffers || []).map(
    (offer: any) => offer.id
  )

  if (offerIds.length) {
    const { data: rides, error: ridesError } = await db
      .from('ride_requests')
      .select('accepted_offer_id')
      .in('accepted_offer_id', offerIds)
      .eq('status', 'completed')

    if (ridesError) {
      console.error('Unable to load completed trips:', ridesError)
    }

    const offerDriver = new Map<string, string>(
      (acceptedOffers || []).map((offer: any) => [
        String(offer.id),
        String(offer.driver_application_id),
      ])
    )

    for (const ride of rides || []) {
      const driverId = offerDriver.get(
        String(ride.accepted_offer_id)
      )

      if (driverId && result[driverId]) {
        result[driverId].completed_trips += 1
      }
    }
  }

  return result
}
