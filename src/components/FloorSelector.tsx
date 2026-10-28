interface FloorSelectorProps {
  floors: string[]
  selectedFloor: string
  onSelectFloor: (floor: string) => void
}

export function FloorSelector({ floors, selectedFloor, onSelectFloor }: FloorSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {floors.map((floor) => (
        <button
          key={floor}
          type="button"
          onClick={() => onSelectFloor(floor)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-heading font-bold transition-all cursor-pointer ${
            selectedFloor === floor
              ? 'border-[#352A47] bg-[#352A47] text-white shadow-dream-soft'
              : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
          }`}
        >
          {floor}
        </button>
      ))}
    </div>
  )
}
