import { useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, File, FileCode2, FileJson, FileText, Folder, FolderOpen,
  GitBranch, Plus, RefreshCw,
} from "lucide-react";
import { buildTree, isDirectory } from "./api";
import type { GithubEntry, TreeNode } from "./api";
import { useDevMind } from "./store";
import { SearchField, Spin } from "./ui";

function getFileIcon(name: string) {
  if (/\.json$/i.test(name)) return FileJson;
  if (/\.(tsx?|jsx?|py|go|rs|java|c|cpp|sql|sh|yml|yaml)$/i.test(name)) return FileCode2;
  if (/\.md$/i.test(name)) return FileText;
  return File;
}

function TreeItems({
  nodes, depth, selected, expanded, onToggle, onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  selected: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (entry: TreeNode) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const dir = isDirectory(node);
        const open = expanded.has(node.path);
        const Icon = dir ? (open ? FolderOpen : Folder) : getFileIcon(node.name);
        return (
          <div key={node.path}>
            <button
              type="button"
              title={node.path}
              className={`dm-tree-item dm-press ${selected === node.path ? "is-selected" : ""}`}
              style={{ paddingLeft: 12 + depth * 16 }}
              onClick={() => (dir ? onToggle(node.path) : onSelect(node))}
            >
              {dir ? (
                <ChevronRight size={14} className={`dm-chev ${open ? "open" : ""}`} />
              ) : (
                <span className="dm-chev-gap" />
              )}
              <Icon size={17} className={dir ? "dm-ic-dir" : "dm-ic-file"} />
              <span className="dm-truncate">{node.name}</span>
            </button>
            {dir && open && node.children && node.children.length > 0 && (
              <TreeItems
                nodes={node.children}
                depth={depth + 1}
                selected={selected}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function FilesPanel({ onOpen }: { onOpen?: () => void }) {
  const dm = useDevMind();
  const [q, setQ] = useState("");
  const { repo } = dm;

  const visible = useMemo(
    () => dm.entries.filter((e) => `${e.path} ${e.name}`.toLowerCase().includes(q.toLowerCase())),
    [dm.entries, q],
  );
  const tree = useMemo(() => buildTree(visible), [visible]);

  const select = (e: GithubEntry) => {
    void dm.selectFile(e);
    onOpen?.();
  };

  return (
    <>
      <div className="dm-ph">
        <h2>Files</h2>
        <div className="dm-tools">
          <button
            className="dm-ib sm dm-press"
            aria-label="Refresh files"
            disabled={!repo || dm.loadingFiles}
            onClick={dm.refreshAll}
          >
            <RefreshCw size={16} className={dm.loadingFiles ? "dm-spin" : ""} />
          </button>
          <label className={`dm-branch ${repo ? "" : "off"}`}>
            <GitBranch size={14} />
            <select
              value={dm.branch}
              disabled={!repo}
              aria-label="Select branch"
              onChange={(e) => dm.changeBranch(e.target.value)}
            >
              {dm.branches.length ? (
                dm.branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)
              ) : (
                <option value={dm.branch}>{dm.branch}</option>
              )}
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
      </div>
      <div className="dm-pad">
        <SearchField value={q} onChange={setQ} placeholder="Search files" disabled={!repo} />
      </div>
      <div className="dm-pscroll">
        {!repo ? (
          <div className="dm-empty">
            <span className="dm-empty-ic"><Folder size={24} /></span>
            <strong>No repository imported</strong>
            <span>Pick one from the menu to browse its folders and files.</span>
            <button className="dm-btn g dm-press dm-inline-btn" onClick={() => dm.drawer.current.open()}>
              <Plus size={17} /> Choose a repository
            </button>
          </div>
        ) : dm.loadingFiles && tree.length === 0 ? (
          <div className="dm-state"><Spin size={18} /> Loading repository tree…</div>
        ) : tree.length ? (
          <TreeItems
            nodes={tree}
            depth={0}
            selected={dm.selectedFile?.path || ""}
            expanded={dm.expanded}
            onToggle={dm.toggleDirectory}
            onSelect={select}
          />
        ) : (
          <div className="dm-empty">
            <Folder size={26} />
            <strong>No files to display</strong>
            <span>Check the branch or clear your search.</span>
          </div>
        )}
      </div>
    </>
  );
}