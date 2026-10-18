import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { SurfaceCard } from '../components/SurfaceCard'
import { buildings } from '../data/buildings'
import { campusModelMapById } from '../data/campusModelMapping'

export function CampusExplorerScreen() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('main-block')
  const [selectedFloor, setSelectedFloor] = useState<string>('G')

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [selectedBuildingId],
  )

  const selectedMapping = selectedBuildingId ? campusModelMapById[selectedBuildingId as keyof typeof campusModelMapById] ?? null : null
  const availableFloors = useMemo(() => {
    if (!selectedMapping) {
      return []
    }

    return Object.keys(selectedMapping.floorObjects).map((floor) => floor.toUpperCase())
  }, [selectedMapping])

  useEffect(() => {
    if (availableFloors.length > 0 && !availableFloors.includes(selectedFloor.toUpperCase())) {
      setSelectedFloor(availableFloors[0])
    }
  }, [availableFloors, selectedFloor])

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3 md:p-5">
      <SurfaceCard title="3D Campus Explorer" subtitle="Explore the MNMJEC campus in 3D">
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="building-select">
          Building focus
        </label>
        <select
          id="building-select"
          value={selectedBuildingId}
          onChange={(event) => setSelectedBuildingId(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Campus overview</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
        {selectedBuilding && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <div>
            <p className="font-medium text-slate-800">{selectedBuilding.name}</p>
            <p className="text-xs text-slate-500">{selectedBuilding.floorInfo.label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedBuildingId('')}
                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                Clear selection
              </button>
              <Link className="rounded-xl bg-[#2A9D8F] px-3 py-2 text-xs font-semibold text-white" to={`/building/${selectedBuilding.id}`}>
                Open details
              </Link>
            </div>
          </div>
        )}
      </SurfaceCard>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:p-3" aria-label="Interactive campus map">
        <Campus3D
          selectedBuildingId={selectedBuildingId}
          selectedFloor={selectedFloor}
          onBuildingSelect={(token) => {
            setSelectedBuildingId(token)
          }}
          onSelectionChange={(buildingId) => {
            setSelectedBuildingId(buildingId ?? '')
          }}
        />

        {selectedMapping && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Floor selection</div>
                <div className="text-xs text-slate-500">{selectedMapping.indoorAvailable ? 'Indoor map available for known floors' : 'Indoor map not mapped yet'}</div>
              </div>
              <div className="rounded-full bg-[#2A9D8F]/10 px-2 py-1 text-xs font-semibold text-[#2A9D8F]">{selectedMapping.knownFloorLabel}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableFloors.map((floor) => (
                <button
                  key={floor}
                  type="button"
                  onClick={() => setSelectedFloor(floor)}
                  aria-pressed={selectedFloor.toUpperCase() === floor}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition ${
                    selectedFloor.toUpperCase() === floor ? 'bg-[#2A9D8F] text-white ring-[#2A9D8F]' : 'bg-white text-slate-700 ring-slate-200'
                  }`}
                >
                  Floor {floor}
                </button>
              ))}
            </div>
            {!selectedMapping.indoorAvailable && <p className="mt-3 text-sm text-slate-600">Indoor map not mapped yet.</p>}
          </div>
        )}
      </section>
    </div>
  )
}
