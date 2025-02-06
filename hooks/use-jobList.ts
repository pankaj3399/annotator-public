import { create } from 'zustand'

export interface Job {
  _id: string
  user: string
  projectid: string
  taskid: string
  modelid: string
  completed: boolean
}

type Status = {
  Jobs: Job[]
  setJobs: (data: Job[]) => void
  getJobs: () => Job[]
  setJob: (data: Job) => void
  removeJob: (id: string) => void
  removeJobByTaskid: (id: string) => void
  getcompletedJobCount: () => number
  getUncompletedJobCount: () => number
  deleteCompleted: () => void
}

const useJobList = create<Status>()((set, get) => ({
  Jobs: [],
  setJobs: (data: Job[]) => set({ Jobs: data }),
  getJobs: () => get().Jobs,
  setJob: (data: Job) => set({ Jobs: [...get().Jobs, data] }),
  removeJob: (id: string) => set({ Jobs: get().Jobs.filter((Job) => Job._id !== id) }),
  removeJobByTaskid: (id: string) => set({ Jobs: get().Jobs.filter((Job) => Job.taskid !== id) }),
  getcompletedJobCount: () => get().Jobs.filter((Job) => Job.completed == true).length,
  getUncompletedJobCount: () => get().Jobs.filter((Job) => Job.completed == false).length,
  deleteCompleted: () => set({ Jobs: get().Jobs.filter((Job) => Job.completed == false) }),
}))

export default useJobList