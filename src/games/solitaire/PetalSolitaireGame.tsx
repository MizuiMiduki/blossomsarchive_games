import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  Card,
  SolitaireState,
  dealSolitaire,
  SUIT_ICONS,
  RANK_NAMES,
} from './logic.ts';

export const PetalSolitaireGame: Component = () => {
  const [state, setState] = createSignal<SolitaireState>(dealSolitaire());
  const [selectedCard, setSelectedCard] = createSignal<{ card: Card; from: 'waste' | 'tableau'; col?: number } | null>(null);
  const [score, setScore] = createSignal(0);
  const [isVictory, setIsVictory] = createSignal(false);

  const restart = () => {
    setState(dealSolitaire());
    setSelectedCard(null);
    setScore(0);
    setIsVictory(false);
  };

  // 山札をめくる
  const drawStock = () => {
    sound.playPop(480);
    const s = { ...state() };
    if (s.stock.length > 0) {
      const card = s.stock.pop()!;
      card.faceUp = true;
      s.waste.push(card);
    } else {
      // 捨て札を山札に戻す
      s.stock = s.waste.reverse().map((c) => ({ ...c, faceUp: false }));
      s.waste = [];
    }
    setState({ ...s });
    setSelectedCard(null);
  };

  // 組札に置けるか判定
  const canPlaceOnFoundation = (card: Card, foundation: Card[]) => {
    if (foundation.length === 0) {
      return card.rank === 1; // Aのみ置ける
    }
    const top = foundation[foundation.length - 1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  };

  // 場札に置けるか判定 (赤黒交互、数字が1小さい)
  const canPlaceOnTableau = (card: Card, tableauCol: Card[]) => {
    if (tableauCol.length === 0) {
      return card.rank === 13; // Kのみ置ける
    }
    const top = tableauCol[tableauCol.length - 1];
    if (!top.faceUp) return false;
    const cardColor = SUIT_ICONS[card.suit].color;
    const topColor = SUIT_ICONS[top.suit].color;
    return cardColor !== topColor && top.rank === card.rank + 1;
  };

  // スマートタップ (タップしたカードを組札へ自動送り、または場札へ移動)
  const handleCardClick = (card: Card, from: 'waste' | 'tableau', colIndex?: number) => {
    if (!card.faceUp) return;
    const s = { ...state() };

    // 1. まず組札に置けるかチェック
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, s.foundations[f])) {
        // 組札へ移動
        if (from === 'waste') {
          s.waste.pop();
        } else if (from === 'tableau' && colIndex !== undefined) {
          s.tableau[colIndex].pop();
          // 下のカードを表向きにする
          if (s.tableau[colIndex].length > 0) {
            s.tableau[colIndex][s.tableau[colIndex].length - 1].faceUp = true;
          }
        }
        s.foundations[f].push(card);
        setScore((sc) => sc + 50);
        sound.playMatch(5);
        setState({ ...s });
        checkVictory(s);
        return;
      }
    }

    // 2. 組札に置けない場合、選択状態にして移動先を待つ
    sound.playPop(420);
    setSelectedCard({ card, from, col: colIndex });
  };

  // 場札の列をクリックして移動
  const handleTableauColClick = (colIndex: number) => {
    const sel = selectedCard();
    if (!sel) return;

    const s = { ...state() };
    const targetCol = s.tableau[colIndex];

    if (canPlaceOnTableau(sel.card, targetCol)) {
      if (sel.from === 'waste') {
        s.waste.pop();
        targetCol.push(sel.card);
      } else if (sel.from === 'tableau' && sel.col !== undefined) {
        const sourceCol = s.tableau[sel.col];
        const cardIdx = sourceCol.findIndex((c) => c.id === sel.card.id);
        if (cardIdx >= 0) {
          const movingCards = sourceCol.splice(cardIdx);
          targetCol.push(...movingCards);
          if (sourceCol.length > 0) {
            sourceCol[sourceCol.length - 1].faceUp = true;
          }
        }
      }
      setScore((sc) => sc + 20);
      sound.playPop(520);
      setState({ ...s });
      setSelectedCard(null);
    }
  };

  const checkVictory = (s: SolitaireState) => {
    const totalFoundationCards = s.foundations.reduce((acc, f) => acc + f.length, 0);
    if (totalFoundationCards === 52) {
      setIsVictory(true);
    }
  };

  onSettled(() => {
    restart();
  });

  const instructions = [
    '山札と場札からカードを移動させ、右上の4つの枠（組札）にAからKまで揃えましょう。',
    '場札は「赤と黒が交互」かつ「数字が1つ小さい順」に重ねられます。',
    '表向きのカードをタップすると、可能な場合は自動的に組札へ移動します！',
  ];

  return (
    <GameShell
      id="petal-solitaire"
      title="Petal Solitaire"
      score={score()}
      isGameOver={false}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-md flex flex-col gap-3 p-2 bg-emerald-800/90 dark:bg-emerald-950 p-3 rounded-3xl shadow-xl border-4 border-emerald-900/60 select-none text-xs">
        {/* 上部: 山札 / 捨て札 / 組札 (4つ) */}
        <div class="flex items-center justify-between">
          {/* 山札 & 捨て札 */}
          <div class="flex items-center gap-2">
            <button
              onClick={drawStock}
              class="w-11 h-16 sm:w-12 sm:h-18 rounded-lg bg-emerald-700 border-2 border-emerald-500 shadow-sm flex items-center justify-center text-white font-bold hover:scale-105 active:scale-95 transition-all"
            >
              <Show when={state().stock.length > 0} fallback={<span class="text-xs">🔄</span>}>
                🌸
              </Show>
            </button>
            <div class="w-11 h-16 sm:w-12 sm:h-18 rounded-lg border-2 border-dashed border-emerald-600 flex items-center justify-center relative">
              <Show when={state().waste.length > 0}>
                {(() => {
                  const card = state().waste[state().waste.length - 1];
                  const info = SUIT_ICONS[card.suit];
                  return (
                    <button
                      onClick={() => handleCardClick(card, 'waste')}
                      class={`w-full h-full rounded-lg bg-white shadow-md border flex flex-col items-center justify-between p-1 ${
                        info.color === 'red' ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      <span class="font-bold text-xs">{RANK_NAMES[card.rank]}</span>
                      <span class="text-base leading-none">{info.icon}</span>
                    </button>
                  );
                })()}
              </Show>
            </div>
          </div>

          {/* 組札 (4スート) */}
          <div class="flex items-center gap-1.5">
            <For each={state().foundations}>
              {(foundation) => (
                <div class="w-11 h-16 sm:w-12 sm:h-18 rounded-lg border-2 border-emerald-600/80 bg-emerald-900/40 flex items-center justify-center relative shadow-inner">
                  <Show when={foundation.length > 0} fallback={<span class="text-emerald-500/40 text-sm">♦</span>}>
                    {(() => {
                      const top = foundation[foundation.length - 1];
                      const info = SUIT_ICONS[top.suit];
                      return (
                        <div
                          class={`w-full h-full rounded-lg bg-white shadow-md border flex flex-col items-center justify-between p-1 ${
                            info.color === 'red' ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          <span class="font-bold text-xs">{RANK_NAMES[top.rank]}</span>
                          <span class="text-base leading-none">{info.icon}</span>
                        </div>
                      );
                    })()}
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* 下部: 場札 (7列) */}
        <div class="grid grid-cols-7 gap-1.5 min-h-[220px]">
          <For each={state().tableau}>
            {(col, colIdx) => (
              <div
                onClick={() => handleTableauColClick(colIdx())}
                class="w-full min-h-[160px] rounded-lg border border-dashed border-emerald-700/50 relative flex flex-col items-center pt-1"
              >
                <For each={col}>
                  {(card, cIdx) => {
                    const info = SUIT_ICONS[card.suit];
                    const isSel = () => selectedCard()?.card.id === card.id;

                    return (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(card, 'tableau', colIdx());
                        }}
                        style={{ 'margin-top': cIdx() === 0 ? '0px' : '-44px' }}
                        class={`w-11 h-16 sm:w-12 sm:h-18 rounded-lg shadow-md border transition-all cursor-pointer ${
                          card.faceUp
                            ? 'bg-white'
                            : 'bg-emerald-600 border-emerald-500'
                        } ${isSel() ? 'ring-2 ring-amber-400 scale-105 z-20' : 'z-10'}`}
                      >
                        <Show when={card.faceUp} fallback={<div class="w-full h-full flex items-center justify-center text-xs">🌸</div>}>
                          <div
                            class={`w-full h-full flex flex-col items-center justify-between p-1 ${
                              info.color === 'red' ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            <span class="font-bold text-[11px] leading-tight">{RANK_NAMES[card.rank]}</span>
                            <span class="text-sm leading-none">{info.icon}</span>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
    </GameShell>
  );
};
