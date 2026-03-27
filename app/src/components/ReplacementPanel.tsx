import React from "react";
import Tile from "./Tile";

const emitHover = (tile: string | null) =>
    window.dispatchEvent(new CustomEvent("shanten:hover-tile", { detail: tile }));

export default function ReplacementPanel({
                                             replacementTiles,
                                             usedCount,
                                         }: {
    replacementTiles: string[];
    usedCount: number;
}) {
    const [hovered, setHovered] = React.useState<string | null>(null);

    // 移除滚动相关的ref和动画逻辑（不再需要横向滚动）
    // scrollRef、rafRef、targetRef 全部删除
    // animate、onWheel 函数也删除

    React.useEffect(() => {
        const onHover = (e: Event) => {
            const ce = e as CustomEvent<string | null>;
            setHovered(ce.detail ?? null);
        };
        window.addEventListener("shanten:hover-tile", onHover as EventListener);
        return () => window.removeEventListener("shanten:hover-tile", onHover as EventListener);
    }, []);

    const lastIdx = Math.max(-1, usedCount - 1);

    // 新增：将一维数组转为二维数组，每行9个元素
    const getGridRows = () => {
        const rows = [];
        for (let i = 0; i < replacementTiles.length; i += 9) {
            rows.push(replacementTiles.slice(i, i + 9));
        }
        return rows;
    };
    const tileRows = getGridRows();

    return (
        <section className="mj-panel" style={{
            marginTop: 12,
            overflowY: "auto", // 纵向滚动（如果超过高度）
            paddingBottom: 16 // 底部留白
        }}>
            <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>替换序列</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                    可替换 {replacementTiles.length} 张 · 已替换 {usedCount} 张
                </div>
            </div>

            {/* 改造核心：网格布局，每行9张，居中展示 */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center", // 整体居中
                    gap: 12, // 行间距
                }}
            >
                {tileRows.map((row, rowIdx) => (
                    <div
                        key={`row-${rowIdx}`}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(9, min-content)", // 每行9列
                            gap: 10, // 列间距（和原有一致）
                            justifyContent: "center", // 行内元素居中（最后一行不足9个时）
                        }}
                    >
                        {row.map((t, colIdx) => {
                            // 计算全局索引（行索引*9 + 列索引）
                            const globalIdx = rowIdx * 9 + colIdx;
                            const used = globalIdx <= lastIdx;
                            return (
                                <div key={`${t}-${globalIdx}`} style={{ display: "grid", justifyItems: "center" }}>
                                    <div
                                        style={{
                                            position: "relative",
                                            borderRadius: 8,
                                            outline: used ? "2px solid rgba(16,185,129,.85)" : "none",
                                            outlineOffset: used ? 2 : 0,
                                            marginBottom: 10,
                                        }}
                                        onMouseEnter={() => emitHover(t)}
                                        onMouseLeave={() => emitHover(null)}
                                        onClick={() => emitHover(t)}
                                        title={`${t}${used ? "（已替）" : ""}`}
                                    >
                                        <Tile
                                            tile={t}
                                            dim={false}
                                            hoveredTile={hovered}
                                            setHoveredTile={(x) => emitHover(x)}
                                            width={54}
                                            height={72}
                                        />

                                        {used && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: "#fff",
                                                    background: "rgba(16,185,129,0.88)",
                                                    padding: "4px 10px",
                                                    borderRadius: 8,
                                                    boxShadow: "0 0 6px rgba(0,0,0,0.25)",
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                已替
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ height: 18, display: "grid", placeItems: "center" }}>
                                        {globalIdx === lastIdx && usedCount > 0 && (
                                            <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                                                <div
                                                    style={{
                                                        width: 0,
                                                        height: 0,
                                                        borderLeft: "6px solid transparent",
                                                        borderRight: "6px solid transparent",
                                                        borderTop: "8px solid rgba(59,130,246,.9)",
                                                    }}
                                                />
                                                <div style={{ fontSize: 11, color: "rgba(59,130,246,.9)" }}>当前</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </section>
    );
}
