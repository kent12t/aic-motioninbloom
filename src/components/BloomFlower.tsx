interface BloomFlowerProps {
  stage: number
}

export function BloomFlower({ stage }: BloomFlowerProps) {
  return (
    <div className={`flower stage-${stage}`}>
      <span className="stem" />
      <span className="petal p1" />
      <span className="petal p2" />
      <span className="petal p3" />
      <span className="petal p4" />
      <span className="core" />
    </div>
  )
}
