import { type StreamableValue, createStreamableValue } from "ai/rsc";

export interface SyncReducer<State, Action> {
	dispatch: (action: Action) => State;
	streamableValue: StreamableValue<Action>;
	done: () => void;
	state: State;
}

export function syncReducer<State, Action>(initialState: State, reducer: (state: State, action: Action) => State): SyncReducer<State, Action> {
	const streamableValue = createStreamableValue<Action>();

	const syncReducerObj: SyncReducer<State, Action> = {
		state: initialState,
		dispatch: (action: Action) => {
			syncReducerObj.state = reducer(syncReducerObj.state, action);
			streamableValue.update(action);
			return syncReducerObj.state;
		},
		streamableValue: streamableValue.value,
		done: () => streamableValue.done(),
	};

	return syncReducerObj;
}
