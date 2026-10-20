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
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
            selectedFloor === floor
              ? 'border-cyan-500/50 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/20'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          {floor}
        </button>
      ))}
    </div>
  )
}
