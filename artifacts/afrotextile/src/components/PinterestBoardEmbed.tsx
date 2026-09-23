import { useEffect } from "react";

interface PinterestBoardEmbedProps {
  boardUrl: string;
}

interface PinterestWindow extends Window {
  parsePins?: () => void;
}

const PINTEREST_SCRIPT_ID = "pinterest-widget-script";
const PINTEREST_SCRIPT_SRC = "https://assets.pinterest.com/js/pinit.js";

export function PinterestBoardEmbed({ boardUrl }: PinterestBoardEmbedProps) {
  useEffect(() => {
    const parsePins = () => {
      (window as PinterestWindow).parsePins?.();
    };

    let script = document.querySelector<HTMLScriptElement>(`#${PINTEREST_SCRIPT_ID}`);
    if (!script) {
      script = document.createElement("script");
      script.id = PINTEREST_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = PINTEREST_SCRIPT_SRC;
      script.addEventListener("load", parsePins);
      document.body.appendChild(script);
    } else {
      parsePins();
    }

    const parseTimer = window.setTimeout(parsePins, 250);
    return () => {
      script?.removeEventListener("load", parsePins);
      window.clearTimeout(parseTimer);
    };
  }, [boardUrl]);

  return (
    <div className="pinterest-board-embed" aria-label="Nigerian fashion trends Pinterest board">
      <a
        data-pin-do="embedBoard"
        data-pin-board-width="900"
        data-pin-scale-height="420"
        data-pin-scale-width="80"
        href={boardUrl}
      >
        Nigerian fashion trends on Pinterest
      </a>
    </div>
  );
}