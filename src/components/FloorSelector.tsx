interface FloorSelectorProps {
  floors: string[]
  selectedFloor: string
  onSelectFloor: (floor: string) => void
}

export function FloorSelector({ floors, selectedFloor, onSelectFloor }: FloorSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {floors.map((floor) => (
        <button
          key={floor}
          type="button"
          onClick={() => onSelectFloor(floor)}
          className={`rounded-lg border px-3 py-2 text-sm ${
            selectedFloor === floor
              ? 'border-[#2A9D8F] bg-[#2A9D8F] text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          {floor}
        </button>
      ))}
    </div>
  )
}
