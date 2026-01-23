"use client";
import { Draft, create as mutativeCreate } from "mutative";
import { StoreApi, create, useStore } from "zustand";
import { PersistOptions, persist, devtools } from "zustand/middleware";
import React, { ReactNode, useRef, createContext, useContext } from "react";
import { set as lodashSet } from "lodash";

type MutativeFunction<T> = (draft: Draft<T>) => void;

type MutativeConfigSetFunction<T> = (
  fn: MutativeFunction<T>,
  name?: string,
  commit?: boolean,
) => void | StoreReset<T>;

export type MatativeConfig<T> = (
  set: MutativeConfigSetFunction<T>,
  get: StoreApi<T>["getState"],
  store: T,
) => T;

export type SetterFunction<T> = (t: T) => void;

export function createSetterFunction<T, S extends object>(
  path: string,
  name: string,
  set: MutativeConfigSetFunction<S>,
): SetterFunction<T> {
  return (val) =>
    set((draft: Draft<S>) => {
      lodashSet(draft, path, val);
    }, name);
}

type StoreSetFunction<T> = StoreApi<T>["setState"] extends (
  ...a: infer U
) => infer R
  ? (...a: [...U, string | undefined]) => R
  : never;

export const mutative =
  <T>(config: MatativeConfig<T>) =>
  (set: StoreSetFunction<T>, get: StoreApi<T>["getState"], store: T) =>
    config(
      (fn, name, commit) => set(mutativeCreate(fn), commit || false, name),
      get,
      store,
    );

type StoreReset<T> = (newState: Draft<T>) => void;
export type StoreSet<T> = MutativeConfigSetFunction<T>;
export type StoreGet<T> = () => T;

export function createStore<T>(
  store: any,
  persistArgs: PersistOptions<any, any>,
) {
  return create<T>()(devtools(persist(mutative(store), persistArgs)));
}

type StoreProviderProps = { children: ReactNode };

export function createStoreBindings<T = unknown>(
  storeName: string,
  createStoreFunc: () => StoreApi<T>,
) {
  const storeContext = createContext<StoreApi<T> | null>(null);

  const provider: React.FC<StoreProviderProps> = ({ children }) => {
    const storeRef = useRef<StoreApi<T> | undefined>(undefined);

    if (!storeRef.current) {
      storeRef.current = createStoreFunc();
    }

    return React.createElement(
      storeContext.Provider,
      { value: storeRef.current },
      children,
    );
  };

  function useTStore<S>(fn: (state: T) => S): S {
    const context = useContext(storeContext);

    if (!context) {
      throw new Error(
        `use${storeName} must be use within ${storeName}Provider`,
      );
    }

    return useStore(context, fn);
  }

  return {
    provider,
    context: storeContext,
    useStore: useTStore,
  };
}
