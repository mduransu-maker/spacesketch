import type { PointerEvent, KeyboardEvent, RefObject } from "react";
import { PARTS, formatMm, type Part, type Plan } from "../lib/model";
import {
  PLAN_PADDING,
  INITIAL_VIEW,
  planViewBox,
  type Viewport,
} from "../lib/viewport";
export function PartSymbol({ part }: { part: Part }) {
  const { width: w, depth: d, kind, flipped } = part;
  const ink = "#233e70",
    blue = "#3157a1",
    stroke = 22;
  if (kind === "door" || kind === "innerDoor")
    return (
      <g transform={flipped ? "scale(-1 1)" : undefined}>
        <path d={`M${-w / 2} 0H${w / 2}`} stroke="#fff" strokeWidth="100" />
        <path
          d={`M${-w / 2} 0V${w}M${-w / 2} ${w}A${w} ${w} 0 0 0 ${w / 2} 0`}
          fill="none"
          stroke={ink}
          strokeWidth={stroke}
        />
        <path d={`M${-w / 2} 0V${w}`} strokeWidth="35" stroke={ink} />
      </g>
    );
  if (kind === "window")
    return (
      <g>
        <path d={`M${-w / 2} 0H${w / 2}`} stroke="white" strokeWidth="100" />
        <rect
          x={-w / 2}
          y={-45}
          width={w}
          height={90}
          fill="#dcecff"
          stroke={blue}
          strokeWidth={stroke}
        />
        <path d={`M${-w / 2} 0H${w / 2}`} stroke={blue} strokeWidth="12" />
      </g>
    );
  if (kind === "socket")
    return (
      <g>
        <path d="M0 0V120" stroke={ink} strokeWidth="17" />
        <circle cy="190" r="80" fill="#fff" stroke={ink} strokeWidth="18" />
        <path d="M-28 163v45M28 163v45" stroke={ink} strokeWidth="18" />
      </g>
    );
  if (kind === "partition")
    return (
      <rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        fill="#b9c3d2"
        stroke={ink}
        strokeWidth="14"
      />
    );
  if (kind === "desk" || kind === "table" || kind === "shelf")
    return (
      <g>
        <rect
          x={-w / 2}
          y={-d / 2}
          width={w}
          height={d}
          rx={kind === "table" ? 90 : 20}
          fill={kind === "shelf" ? "#dce8df" : "#eff5e2"}
          stroke={ink}
          strokeWidth={stroke}
        />
        {kind === "shelf" ? (
          <path
            d={`M${-w / 6} ${-d / 2}V${d / 2}M${w / 6} ${-d / 2}V${d / 2}`}
            stroke={ink}
            strokeWidth="15"
          />
        ) : kind === "desk" ? (
          <>
            <rect
              x={-w * 0.18}
              y={-d * 0.28}
              width={w * 0.36}
              height={d * 0.35}
              rx="15"
              fill="white"
              stroke={ink}
              strokeWidth="15"
            />
            <path
              d={`M${-w * 0.18} ${d * 0.18}H${w * 0.18}`}
              stroke={ink}
              strokeWidth="18"
            />
          </>
        ) : (
          <path
            d={`M${-w * 0.3} 0H${w * 0.3}`}
            stroke={ink}
            strokeWidth="12"
            opacity=".3"
          />
        )}
      </g>
    );
  if (kind === "light")
    return (
      <g>
        <circle r={w / 2} fill="#fffbdc" stroke={ink} strokeWidth="18" />
        <path
          d={`M${-w * 0.33} ${-w * 0.33}L${w * 0.33} ${w * 0.33}M${-w * 0.33} ${w * 0.33}L${w * 0.33} ${-w * 0.33}`}
          stroke={ink}
          strokeWidth="16"
        />
      </g>
    );
  if (kind === "basin")
    return (
      <g>
        <rect
          x={-w / 2}
          y={-d / 2}
          width={w}
          height={d}
          rx={Math.min(w, d) * 0.15}
          fill="#eef5fb"
          stroke={ink}
          strokeWidth={stroke}
        />
        <ellipse
          rx={w * 0.34}
          ry={d * 0.29}
          fill="white"
          stroke={ink}
          strokeWidth="16"
        />
        <circle cy={-d * 0.3} r="22" fill={ink} />
      </g>
    );
  return (
    <g>
      <rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d * 0.28}
        rx="25"
        fill="#eef5fb"
        stroke={ink}
        strokeWidth={stroke}
      />
      <ellipse
        cy={d * 0.1}
        rx={w * 0.44}
        ry={d * 0.35}
        fill="white"
        stroke={ink}
        strokeWidth={stroke}
      />
      <ellipse
        cy={d * 0.1}
        rx={w * 0.27}
        ry={d * 0.22}
        fill="none"
        stroke={ink}
        strokeWidth="14"
      />
    </g>
  );
}
interface Props {
  view?: Viewport;
  panMode?: boolean;
  onBackgroundDown?: (event: PointerEvent<SVGElement>) => void;
  plan: Plan;
  selectedId?: string | null;
  showGrid?: boolean;
  showNumbers?: boolean;
  svgRef?: RefObject<SVGSVGElement | null>;
  onPartDown?: (e: PointerEvent<SVGGElement>, part: Part) => void;
  onMove?: (e: PointerEvent<SVGSVGElement>) => void;
  onUp?: (e: PointerEvent<SVGSVGElement>) => void;
  onCancel?: () => void;
  onSelect?: (id: string | null) => void;
  onPartKey?: (e: KeyboardEvent<SVGGElement>, part: Part) => void;
}
export function PlanSvg({
  view = INITIAL_VIEW,
  panMode = false,
  onBackgroundDown,
  plan,
  selectedId,
  showGrid = true,
  showNumbers = true,
  svgRef,
  onPartDown,
  onMove,
  onUp,
  onCancel,
  onSelect,
  onPartKey,
}: Props) {
  const pad = PLAN_PADDING,
    totalW = plan.length + pad * 2,
    totalH = plan.width + pad * 2;
  const label = Math.max(100, plan.length / 55);
  return (
    <svg
      ref={svgRef}
      id="planner-drawing"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={planViewBox(plan.length, plan.width, view)}
      data-full-viewbox={planViewBox(plan.length, plan.width)}
      style={{
        touchAction: panMode ? "none" : "pan-y",
        cursor: panMode ? "grab" : undefined,
      }}
      className="plan-drawing"
      role="group"
      aria-label="Interactive space plan"
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
    >
      <title>{`Space plan ${formatMm(plan.length)} x ${formatMm(plan.width)} millimetres`}</title>
      <defs>
        <pattern
          id="planner-grid"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path d="M100 0H0V100" fill="none" stroke="#d9e2ee" strokeWidth="4" />
        </pattern>
      </defs>
      <rect
        x={-pad}
        y={-pad}
        width={totalW}
        height={totalH}
        fill="#fff"
        onPointerDown={onBackgroundDown}
      />
      <rect
        width={plan.length}
        height={plan.width}
        fill={showGrid ? "url(#planner-grid)" : "#fff"}
        stroke="#233e70"
        strokeWidth="70"
        onPointerDown={onBackgroundDown}
      />
      <g stroke="#8595ad" strokeWidth="10" fill="none">
        <path
          d={`M0 -300H${plan.length}M0 -380V-190M${plan.length} -380V-190M-300 0V${plan.width}M-380 0H-190M-380 ${plan.width}H-190`}
        />
        <path
          d={`M-35 -265L35 -335M${plan.length - 35} -265L${plan.length + 35} -335M-335 -35L-265 35M-335 ${plan.width - 35}L-265 ${plan.width + 35}`}
        />
      </g>
      <g
        fontFamily="Arial, sans-serif"
        fontSize={label}
        fill="#4a6080"
        textAnchor="middle"
      >
        <text x={plan.length / 2} y="-410">
          {formatMm(plan.length)} mm
        </text>
        <text transform={`translate(-410 ${plan.width / 2}) rotate(-90)`}>
          {formatMm(plan.width)} mm
        </text>
        <text x={plan.length / 2} y={plan.width + 450} fontSize={label * 0.8}>
          TOP VIEW · OUTLINE DIMENSIONS · SCHEMATIC
        </text>
      </g>
      {plan.items
        .map((part, index) => ({ part, index }))
        .sort((a, b) => {
          const layer = (p: Part) =>
            p.kind === "partition"
              ? 0
              : p.kind === "door" || p.kind === "innerDoor"
                ? 2
                : 1;
          return layer(a.part) - layer(b.part);
        })
        .map(({ part, index }) => {
          const selected = part.id === selectedId;
          const hitHeight =
            part.kind === "door" || part.kind === "innerDoor"
              ? part.width
              : part.kind === "socket"
                ? 320
                : Math.max(part.depth, 200);
          const hitWidth = Math.max(part.width, 250);
          return (
            <g
              key={part.id}
              transform={`translate(${part.x} ${part.y}) rotate(${part.rotation})`}
              role={onSelect ? "button" : undefined}
              aria-label={`${PARTS[part.kind].name} ${index + 1}`}
              aria-pressed={selected}
              tabIndex={onSelect ? 0 : undefined}
              data-part-id={part.id}
              data-kind={part.kind}
              style={{
                cursor: onSelect ? "grab" : undefined,
                outline: "none",
                touchAction: "none",
              }}
              onPointerDown={(e) => onPartDown?.(e, part)}
              onFocus={() => onSelect?.(part.id)}
              onKeyDown={(e) => onPartKey?.(e, part)}
            >
              <rect
                x={-hitWidth / 2 - 60}
                y={
                  part.kind === "door" || part.kind === "innerDoor"
                    ? -80
                    : -hitHeight / 2 - 60
                }
                width={hitWidth + 120}
                height={hitHeight + 160}
                fill="transparent"
              />
              <PartSymbol part={part} />
              {selected && (
                <rect
                  data-selection="true"
                  x={-hitWidth / 2 - 70}
                  y={
                    part.kind === "door" || part.kind === "innerDoor"
                      ? -100
                      : -hitHeight / 2 - 80
                  }
                  width={hitWidth + 140}
                  height={hitHeight + 200}
                  rx="25"
                  fill="none"
                  stroke="#c4a92d"
                  strokeWidth="18"
                  strokeDasharray="45 30"
                  pointerEvents="none"
                />
              )}
              {
                <g
                  data-part-number="true"
                  opacity={showNumbers ? 1 : 0}
                  transform={`translate(${hitWidth / 2 + 100} ${-130}) rotate(${-part.rotation})`}
                  pointerEvents="none"
                >
                  <circle
                    r="90"
                    fill={selected ? "#eee34d" : "#eef2f7"}
                    stroke="#8ea0ba"
                    strokeWidth="7"
                  />
                  <text
                    fontFamily="Arial, sans-serif"
                    fontSize="100"
                    fill="#233e70"
                    textAnchor="middle"
                    dy="35"
                  >
                    {index + 1}
                  </text>
                </g>
              }
            </g>
          );
        })}
    </svg>
  );
}
