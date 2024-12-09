import { useCallback, useRef } from 'react'
import type { CarouselApi } from '@/components/ui/carousel'

export const useKeyboardNavigation = () => {
  const apiRef = useRef<CarouselApi>()

  const setApi = useCallback((api: CarouselApi) => {
    apiRef.current = api
  }, [])

  return {
    api: apiRef.current,
    setApi,
  }
}