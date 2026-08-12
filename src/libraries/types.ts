export type LibraryKind = "components" | "boards";
export type LibraryPoint = [number, number];

export type ComponentDefinition = {
  id: string;
  name: string;
  label: string;
  w: number;
  h: number;
  bodyOffsetX: number;
  bodyOffsetY: number;
  color: string;
  pins: LibraryPoint[];
  pinLabels: string[];
  pinColors: string[];
};

export type BoardDefinition = {
  id: string;
  name: string;
  cols: number;
  railCols: number;
  railMargin: number;
  hasRails: boolean;
  color: string;
};

export type ComponentLibraryManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  kind: "components";
  items: ComponentDefinition[];
};

export type BoardLibraryManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  kind: "boards";
  items: BoardDefinition[];
};

export type LibraryManifest = ComponentLibraryManifest | BoardLibraryManifest;
