"use client";

import { stateReducer } from "@/lib/reducer";
import { type AppAction, type AppState, type HistoryEntry, initialState } from "@/lib/state";
import { type ReactNode, createContext, useContext, useEffect, useReducer, useState } from "react";

const StateContext = createContext<
	| {
			state: AppState;
			dispatch: React.Dispatch<AppAction>;
	  }
	| undefined
>(undefined);

export function StateProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(stateReducer, initialState, (initial) => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("appState");
			if (stored) {
				try {
					const parsedState = JSON.parse(stored);
					// Validate the structure of the parsed state
					if (
						typeof parsedState === "object" &&
						Array.isArray(parsedState.history) &&
						typeof parsedState.docs === "object" &&
						typeof parsedState.projectMetadata === "object"
					) {
						// Remove any file-pending entries from history
						parsedState.history = parsedState.history.filter((entry: HistoryEntry) => entry.type !== "file-pending");
						return parsedState as AppState;
					}
				} catch (error) {
					console.error("Error parsing stored state:", error);
				}
			}
		}
		return initial;
	});

	useEffect(() => {
		localStorage.setItem("appState", JSON.stringify(state, null, 2));
	}, [state]);

	// Work around hydration errors the naïve way for now.
	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);
	if (!isClient) {
		return <StateContext.Provider value={{ state: initialState, dispatch: () => {} }}>{children}</StateContext.Provider>;
	}

	return <StateContext.Provider value={{ state, dispatch }}>{children}</StateContext.Provider>;
}

export function useAppState() {
	const context = useContext(StateContext);
	if (context === undefined) {
		throw new Error("useAppState must be used within a StateProvider");
	}
	return context;
}
