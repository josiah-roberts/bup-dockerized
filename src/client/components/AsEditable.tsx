import {
  ComponentClass,
  FunctionalComponent,
  ComponentProps,
  ComponentType,
  JSX,
  h,
} from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { JSXInternal } from "preact/src/jsx";

export function AsEditable<K extends keyof JSX.IntrinsicElements>(As: K) {
  return ({
    onSubmit,
    children: value,
    ...rest
  }: Omit<
    JSX.IntrinsicElements[K],
    "children" | "onSubmit" | "value" | "ref"
  > & {
    children: string;
    onSubmit: (newValue: string, oldValue: string) => Promise<unknown> | void;
  }) => {
    const [state, setState] = useState<"display" | "edit" | "submit">(
      "display"
    );
    const elementRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (elementRef.current) elementRef.current.innerText = value;
    }, [elementRef, value]);

    useEffect(() => {
      if (state === "edit" && elementRef.current) {
        elementRef.current.focus();
      }
    }, [state, elementRef]);

    const doReset = () => {
      setState("display");
      if (elementRef.current) elementRef.current.innerText = value;
    };

    const doSubmit = async () => {
      setState("submit");
      try {
        const text = elementRef.current?.innerText;
        if (text != undefined && text !== value) {
          await onSubmit(text, value);
        }
        setState("display");
      } catch (e: any) {
        alert(e?.message);
        doReset();
      }
    };

    const NastyCast = As as unknown as ComponentType<Record<string, unknown>>;

    return (
      <NastyCast
        onClick={() => setState("edit")}
        {...rest}
        onBlur={() => state === "edit" && doReset}
        onKeyDown={(e: KeyboardEvent) => {
          console.log(e);
          if (e.key === "Escape") {
            doReset();
          }
          if (e.key === "Enter") doSubmit();
        }}
        contentEditable={state === "edit"}
        ref={elementRef}
      />
    );
  };
}
