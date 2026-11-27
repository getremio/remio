// Canonical Remio and Remio Hub brand marks and lockups, sourced directly from
// `assets/brand/` (see `assets/brand/README.md`).

import type * as React from "react";
import hubLockupSvg from "../../../../assets/brand/lockups/hub-white.svg?raw";
import remioHubLockupSvg from "../../../../assets/brand/lockups/remio-hub-white.svg?raw";
import remioLockupSvg from "../../../../assets/brand/lockups/remio-white.svg?raw";
import remioHubMarkSvg from "../../../../assets/brand/marks/remio-hub-white.svg?raw";
import remioMarkSvg from "../../../../assets/brand/marks/remio-white.svg?raw";

interface ParsedMark {
  width: number;
  height: number;
  viewBox: string;
  path: string;
  strokeWidth: number;
}

interface ParsedLockup extends ParsedMark {
  wordmarkPath: string;
}

function readAttr(tag: string, name: string, source: string): string {
  const match = tag.match(new RegExp(`${name}="([^"]+)"`));
  if (!match) {
    throw new Error(`Missing ${name} attribute in canonical brand SVG (${source})`);
  }
  return match[1];
}

function parseSvgHeader(svg: string, source: string) {
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0];
  if (!svgTag) {
    throw new Error(`Missing <svg> root in canonical brand SVG (${source})`);
  }
  const paths = [...svg.matchAll(/<path\b[^>]*\/?>/g)].map((m) => m[0]);
  return {
    width: Number(readAttr(svgTag, "width", source)),
    height: Number(readAttr(svgTag, "height", source)),
    viewBox: readAttr(svgTag, "viewBox", source),
    paths,
  };
}

function parseMark(svg: string, source: string): ParsedMark {
  const { width, height, viewBox, paths } = parseSvgHeader(svg, source);
  if (paths.length !== 1) {
    throw new Error(`Expected 1 path in brand mark SVG (${source}), found ${paths.length}`);
  }
  return {
    width,
    height,
    viewBox,
    path: readAttr(paths[0], "d", source),
    strokeWidth: Number(readAttr(paths[0], "stroke-width", source)),
  };
}

function parseLockup(svg: string, source: string): ParsedLockup {
  const { width, height, viewBox, paths } = parseSvgHeader(svg, source);
  if (paths.length !== 2) {
    throw new Error(`Expected 2 paths in brand lockup SVG (${source}), found ${paths.length}`);
  }
  return {
    width,
    height,
    viewBox,
    path: readAttr(paths[0], "d", source),
    strokeWidth: Number(readAttr(paths[0], "stroke-width", source)),
    wordmarkPath: readAttr(paths[1], "d", source),
  };
}

const REMIO_MARK = parseMark(remioMarkSvg, "marks/remio-white.svg");
const REMIO_HUB_MARK = parseMark(remioHubMarkSvg, "marks/remio-hub-white.svg");
const REMIO_LOCKUP = parseLockup(remioLockupSvg, "lockups/remio-white.svg");
const REMIO_HUB_LOCKUP = parseLockup(remioHubLockupSvg, "lockups/remio-hub-white.svg");
const HUB_LOCKUP = parseLockup(hubLockupSvg, "lockups/hub-white.svg");

function BrandMark({ asset, props }: { asset: ParsedMark; props: React.SVGProps<SVGSVGElement> }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={asset.width}
      height={asset.height}
      viewBox={asset.viewBox}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d={asset.path}
        stroke="currentColor"
        strokeWidth={asset.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Optical horizontal tightening (in 144-unit lockup coordinates) for display-scale lockups.
 * Canonical lockups have a ~91-unit ink-to-ink gap calibrated for ~18–22px header sizes; at
 * 36–48px display sizes that gap reads ~25–30px wide, so `size="display"` pulls the wordmark
 * 44 units closer (~14–16px visual gap, ~1/3 of the mark width) and trims the viewBox to match.
 */
const DISPLAY_GAP_TIGHTEN_UNITS = 44;

export interface BrandLockupProps extends React.SVGProps<SVGSVGElement> {
  /** Optical spacing scale: `"default"` for small UI/header lockups, `"display"` for large headings. */
  size?: "default" | "display";
}

function BrandLockup({ asset, props }: { asset: ParsedLockup; props: BrandLockupProps }) {
  const { size = "default", ...svgProps } = props;
  const tighten = size === "display" ? DISPLAY_GAP_TIGHTEN_UNITS : 0;
  const width = asset.width - tighten;
  const viewBox = tighten > 0 ? `0 0 ${width} ${asset.height}` : asset.viewBox;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={asset.height}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      {...svgProps}
    >
      <path
        d={asset.path}
        stroke="currentColor"
        strokeWidth={asset.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={asset.wordmarkPath}
        fill="currentColor"
        transform={tighten > 0 ? `translate(-${tighten} 0)` : undefined}
      />
    </svg>
  );
}

/** Canonical Remio butterfly mark (700x700 viewBox, stroked with currentColor). */
export function RemioMark(props: React.SVGProps<SVGSVGElement>) {
  return <BrandMark asset={REMIO_MARK} props={props} />;
}

/** Canonical Remio Hub five-petal flower mark (700x700 viewBox, stroked with currentColor). */
export function RemioHubMark(props: React.SVGProps<SVGSVGElement>) {
  return <BrandMark asset={REMIO_HUB_MARK} props={props} />;
}

/** Canonical Remio lockup (butterfly mark at 94% optical scale + Plus Jakarta Sans SemiBold). */
export function RemioLockup(props: BrandLockupProps) {
  return <BrandLockup asset={REMIO_LOCKUP} props={props} />;
}

/** Canonical Remio Hub lockup (flower mark + Plus Jakarta Sans SemiBold). */
export function RemioHubLockup(props: BrandLockupProps) {
  return <BrandLockup asset={REMIO_HUB_LOCKUP} props={props} />;
}

/** Canonical Hub lockup (flower mark + "Hub"), used where Remio is already on screen. */
export function HubLockup(props: BrandLockupProps) {
  return <BrandLockup asset={HUB_LOCKUP} props={props} />;
}
