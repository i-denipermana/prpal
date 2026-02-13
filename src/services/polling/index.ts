/** Polling service barrel export */

export {
  startPolling,
  stopPolling,
  isPolling,
  getLastPollTime,
  getPollCount,
  pollNow,
  resetSchedulerState,
  type PollCallback,
} from './scheduler.js'
