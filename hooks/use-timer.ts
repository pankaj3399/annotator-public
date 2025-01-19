import { create } from 'zustand'

type Timer = {
  time: number
  running: boolean
  setRunning: (running: boolean) => void
  inc: (time: number) => void
}

const useTimer = create<Timer>()((set) => ({
  time: 0,
  running: true,
  setRunning: (running: boolean) => set({ running }),
  inc: (time) => set((state) => ({ time: state.time + time })),
}))

export default useTimer