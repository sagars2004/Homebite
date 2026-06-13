import { motion, useReducedMotion } from "framer-motion";

// A few rows of food & drink emoji that drift sideways while Homebite thinks.
const rows: { items: string[]; reverse: boolean; duration: number }[] = [
  {
    items: [
      "🍔",
      "🍕",
      "🍝",
      "🍜",
      "🍣",
      "🌮",
      "🌯",
      "🥙",
      "🥪",
      "🍟",
      "🌭",
      "🥘",
      "🍛",
      "🍲",
      "🥗",
      "🍱",
      "🍤",
      "🥟",
      "🫔",
      "🧆",
    ],
    reverse: false,
    duration: 22,
  },
  {
    items: [
      "🍎",
      "🍏",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🫐",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥝",
      "🥑",
      "🥦",
      "🥕",
      "🌽",
      "🍅",
      "🥬",
      "🍆",
      "🥔",
      "🫑",
      "🍄",
    ],
    reverse: true,
    duration: 27,
  },
  {
    items: [
      "🍩",
      "🍪",
      "🧁",
      "🍰",
      "🎂",
      "🍫",
      "🍬",
      "🍭",
      "🍮",
      "🍯",
      "🍦",
      "🍨",
      "☕",
      "🍵",
      "🧃",
      "🥤",
      "🧋",
      "🍷",
      "🍺",
      "🥂",
      "🍹",
      "🥛",
    ],
    reverse: false,
    duration: 46,
  },
];

export function FoodMarquee() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex h-1/2 flex-col justify-center gap-3 overflow-hidden pb-[6vh] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      {rows.map((row, index) => {
        const doubled = [...row.items, ...row.items];
        const from = row.reverse ? "-50%" : "0%";
        const to = row.reverse ? "0%" : "-50%";
        return (
          <motion.div
            key={index}
            className="flex w-max text-4xl sm:text-5xl"
            animate={reduceMotion ? undefined : { x: [from, to] }}
            transition={{ duration: row.duration, repeat: Infinity, ease: "linear" }}
          >
            {doubled.map((emoji, position) => (
              <span
                key={`${index}-${position}`}
                className="select-none px-4 opacity-80 drop-shadow-sm sm:px-6"
              >
                {emoji}
              </span>
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}
