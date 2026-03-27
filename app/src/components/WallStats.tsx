import React, { useMemo } from "react";
import Tile from "./Tile";
import styles from "./WallStats.module.css";

export interface WallStatsProps {
    wallTiles: string[];
    replacementTiles: string[];
    handTiles: string[];
    className?: string;
}

/** 归一化：'1m/m1' -> 'm1'；'东' -> 'z1'；'0p' -> 'p0'；'4z' -> 'z4' */
function normalize(raw: string): string {
    const s = raw.trim();
    const honorCN: Record<string, string> = { 东: "z1", 南: "z2", 西: "z3", 北: "z4", 白: "z5", 发: "z6", 中: "z7" };
    if (honorCN[s]) return honorCN[s];
    if (/^[mps][0-9]$/.test(s)) return s;                // m0..m9 / p0..p9 / s0..s9
    if (/^[0-9][mps]$/.test(s)) return `${s[1]}${s[0]}`;  // 1m..9m / 0p..9p
    if (/^z[1-7]$/.test(s)) return s;                     // z1..z7
    if (/^[1-7]z$/.test(s)) return `z${s[0]}`;            // 1z..7z -> z1..z7（修复点）
    return s; // 其他编码原样
}

/** 显示名：0→赤五X；1..9→汉字X；字牌→东南西北白发中（兜底兼容 'Nz'） */
function keyToReadable(key: string): string {
    const suit = key[0];
    const valStr = key.slice(1);
    const v = Number(valStr);
    const suitMap: Record<string, string> = { m: "万", p: "筒", s: "索" };
    const cn = ["零","一","二","三","四","五","六","七","八","九"];

    if (suit === "z") {
        const honors = ["东","南","西","北","白","发","中"];
        return honors[(v - 1 + 7) % 7] ?? key;
    }
    // 兜底：如果 key 形如 "Nz"（例如 "4z"），也能正确显示
    if (/^[1-7]z$/.test(key)) {
        const honors = ["东","南","西","北","白","发","中"];
        const n = Number(key[0]);
        return honors[n - 1] ?? key;
    }

    if (suitMap[suit]) {
        if (v === 0) return `赤五${suitMap[suit]}`;
        if (v >= 1 && v <= 9) return `${cn[v]}${suitMap[suit]}`;
    }
    return key;
}

/** 等价组：普通五 ↔ 赤五；其他牌仅自身 */
function eqGroup(tile: string): string[] {
    const t = normalize(tile);
    if (/^[mps][0-9]$/.test(t)) {
        const suit = t[0];
        const v = Number(t.slice(1));
        if (v === 0) return [t, `${suit}5`];
        if (v === 5) return [t, `${suit}0`];
    }
    return [t];
}

/** 发出两个事件：单值兼容 + 等价组（数组） */
function emitHover(tile: string | null) {
    window.dispatchEvent(new CustomEvent("shanten:hover-tile", { detail: tile }));
    const group = tile ? eqGroup(tile) : [];
    window.dispatchEvent(new CustomEvent("shanten:hover-tile-eq", { detail: group }));
}

export default function WallStats({ wallTiles, replacementTiles, handTiles, className }: WallStatsProps) {
    console.log(wallTiles)
    console.log(replacementTiles)
    console.log(handTiles)
    // 核心改造：统计牌山前2张 + 手牌 + 替换牌的总数量，以及替换牌中最后一张的位置
    const list = useMemo(() => {
        // 1. 提取牌山前2张（注意处理空数组情况）
        const wallTop2 = wallTiles.slice(0, 2);
        // 2. 合并所有需要统计的牌：牌山前2张 + 手牌 + 替换牌
        const allTiles = [...wallTop2, ...handTiles, ...replacementTiles];
        // 3. 预处理替换牌：建立「归一化牌名 → 所有索引数组」的映射
        const replacementTileIndexMap = new Map<string, number[]>();
        replacementTiles.forEach((tile, index) => {
            const normTile = normalize(tile);
            if (!replacementTileIndexMap.has(normTile)) {
                replacementTileIndexMap.set(normTile, []);
            }
            replacementTileIndexMap.get(normTile)!.push(index + 1); // 位置从1开始计数（用户更易理解）
        });

        // 4. 统计总数量 + 提取替换牌最后一张位置（默认0）
        const map = new Map<string, {
            count: number;
            sample: string;
            lastReplacementPos: number; // 改为number类型，默认0
        }>();

        for (const t of allTiles) {
            const k = normalize(t);
            const cur = map.get(k);
            if (cur) {
                cur.count += 1;
            } else {
                // 获取该牌在替换牌中最后一张的位置，无则为0
                const posList = replacementTileIndexMap.get(k) || [];
                const lastPos = posList.length > 0 ? posList[posList.length - 1] : 0;
                map.set(k, {
                    count: 1,
                    sample: t,
                    lastReplacementPos: lastPos
                });
            }
        }

        // 5. 新排序规则：1. count倒序 2. lastReplacementPos正序
        return Array.from(map.entries())
            .sort((a, b) => {
                // 先按数量倒序
                const countDiff = b[1].count - a[1].count;
                if (countDiff !== 0) return countDiff;
                // 数量相同时，按替换牌位置正序
                return a[1].lastReplacementPos - b[1].lastReplacementPos;
            })
            .map(([key, v]) => ({
                key,
                sample: v.sample,
                readable: keyToReadable(key),
                count: v.count,
                lastReplacementPos: v.lastReplacementPos
            }));
    }, [wallTiles, replacementTiles, handTiles]); // 依赖所有数据源

    return (
        <aside className={[styles.wrap, className].filter(Boolean).join(" ")}>
            <div className={`mj-panel ${styles.panel}`}>
                <div className={styles.header}>
                    <div className={styles.title}>花火统计</div>
                </div>

                <div className={styles.list}>
                    {list.length === 0 ? (
                        <div className={styles.empty}>当前无可统计牌</div>
                    ) : (
                        list.map(({ key, sample, readable, count, lastReplacementPos }) => (
                            <div
                                className={styles.item}
                                key={key}
                                onMouseEnter={() => emitHover(sample)}
                                onMouseLeave={() => emitHover(null)}
                                onClick={() => emitHover(sample)}
                            >
                                <div className={styles.tileBox}>
                                    <Tile
                                        tile={sample}
                                        dim={false}
                                        hoveredTile={null}               // 侧栏不吃外部高亮
                                        setHoveredTile={(t) => emitHover(t || null)}
                                        width={44}
                                        height={60}
                                    />
                                </div>
                                <div className={styles.meta}>
                                    <div className={styles.name}>{readable}</div>
                                    {/* 改造：展示文本改为 换：X张 / 换0张 */}
                                    <div className={styles.subtext}>
                                        {`换：${lastReplacementPos}张`}
                                    </div>
                                </div>
                                <div className={styles.count}>×{count}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
}
