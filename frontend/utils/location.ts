/**
 * Location utilities for getting user's geolocation
 */

export interface LocationCoordinates {
  latitude: number
  longitude: number
}

/**
 * Get user's current location
 * Returns null if location access is denied or unavailable
 */
export const getUserLocation = (): Promise<LocationCoordinates | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser')
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        console.warn('Location access denied:', error.message)
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    )
  })
}

/**
 * Request location permission
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const location = await getUserLocation()
    return location !== null
  } catch {
    return false
  }
}
