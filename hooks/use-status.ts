import { create } from 'zustand'

type Status = {
  status: string
  submitted: boolean
  setSubmitted: (submitted: boolean) => void
  setStatus: (status: string) => void
}

const useStatus = create<Status>()((set) => ({
  status: 'pending',
  submitted: false,
  setSubmitted: (submitted: boolean) => set(() => ({ submitted })),
  setStatus: (status: string) => set(() => ({ status })),
}))

export default useStatus