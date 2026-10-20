import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  GpsLocationService,
  MockGeolocationProvider,
} from '../gpsService.ts'
import type { GpsCoordinates, GpsServiceStatus } from '../../types/gps.ts'

describe('GPS Location Service & Mock Provider', () => {
  it('initializes in idle state with mock provider', () => {
    const mock = new MockGeolocationProvider()
    const service = new GpsLocationService(mock)

    assert.equal(service.getStatus(), 'idle')
    assert.equal(service.isTracking(), false)
    assert.equal(service.getLastCoordinates(), null)
  })

  it('starts tracking, receives position updates, and notifies listeners', () => {
    const mock = new MockGeolocationProvider()
    const service = new GpsLocationService(mock)

    let receivedPosition: GpsCoordinates | null = null
    const unsubscribe = service.addListener({
      onPosition: (pos) => {
        receivedPosition = pos
      },
      onError: () => {},
    })

    service.startTracking()
    assert.equal(service.isTracking(), true)
    assert.equal(mock.watcherCount, 1)

    // Emit simulated position
    mock.emitPosition(12.8715, 80.2195, 7.5)

    assert.ok(receivedPosition !== null)
    const pos = receivedPosition as unknown as GpsCoordinates
    assert.equal(pos.latitude, 12.8715)
    assert.equal(pos.longitude, 80.2195)
    assert.equal(pos.accuracy, 7.5)
    assert.equal(service.getStatus(), 'active')

    unsubscribe()
  })

  it('stops tracking and properly clears active watch registration', () => {
    const mock = new MockGeolocationProvider()
    const service = new GpsLocationService(mock)

    service.addListener({
      onPosition: () => {},
      onError: () => {},
    })

    service.startTracking()
    assert.equal(service.isTracking(), true)
    assert.equal(mock.watcherCount, 1)

    service.stopTracking()
    assert.equal(service.isTracking(), false)
    assert.equal(service.getStatus(), 'idle')
    assert.equal(mock.watcherCount, 0)
  })

  it('automatically stops tracking when all listeners unsubscribe', () => {
    const mock = new MockGeolocationProvider()
    const service = new GpsLocationService(mock)

    const unsubscribe = service.addListener({
      onPosition: () => {},
      onError: () => {},
    })

    service.startTracking()
    assert.equal(service.isTracking(), true)

    unsubscribe()
    assert.equal(service.isTracking(), false)
    assert.equal(mock.watcherCount, 0)
  })

  it('handles permission denied errors properly and halts tracking', () => {
    const mock = new MockGeolocationProvider()
    const service = new GpsLocationService(mock)

    let reportedStatus: GpsServiceStatus | null = null
    let reportedMsg: string = ''

    service.addListener({
      onPosition: () => {},
      onError: (status, msg) => {
        reportedStatus = status
        reportedMsg = msg
      },
    })

    service.startTracking()
    // Code 1 = PERMISSION_DENIED
    mock.emitError(1, 'User denied geolocation prompt')

    assert.equal(reportedStatus, 'permission_denied')
    assert.ok(reportedMsg.includes('permission was denied'))
    assert.equal(service.isTracking(), false)
  })

  it('swaps providers cleanly when switching to test mode and back', () => {
    const mock1 = new MockGeolocationProvider()
    const mock2 = new MockGeolocationProvider()
    const service = new GpsLocationService(mock1)

    service.addListener({
      onPosition: () => {},
      onError: () => {},
    })

    service.startTracking()
    assert.equal(mock1.watcherCount, 1)

    // Swap provider while tracking
    service.setProvider(mock2)
    assert.equal(mock1.watcherCount, 0)
    assert.equal(mock2.watcherCount, 1)
    assert.equal(service.isTracking(), true)

    service.stopTracking()
    assert.equal(mock2.watcherCount, 0)
  })
})
