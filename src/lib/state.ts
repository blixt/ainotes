export interface File {
	path: string;
	title: string;
	content: string;
	commitMessage: string;
}

type FileUpdate = { path: string; commitMessage: string } & Partial<Omit<File, "path" | "commitMessage">>;

export type HistoryEntry =
	| {
			type: "text";
			id: string;
			isFromUser: boolean;
			text: string;
	  }
	| {
			type: "thought";
			id: string;
			isFromUser: false;
			text: string;
	  }
	| {
			type: "file";
			id: string;
			isFromUser: false;
			path: string;
			commitMessage: string;
			op:
				| {
						type: "create";
						title: string;
						preview: string;
				  }
				| {
						type: "update";
						title: string;
						preview?: string;
				  }
				| {
						type: "delete";
				  }
				| {
						type: "rename";
						newPath: string;
				  };
	  }
	| {
			type: "file-pending";
			id: "file-pending";
			isFromUser: false;
			op: "create" | "update" | "delete" | "rename" | "read";
			paths: string[];
	  }
	| {
			type: "file-read";
			id: string;
			isFromUser: false;
			path: string;
	  }
	| {
			type: "metadata";
			id: string;
			isFromUser: false;
			diff: Record<string, string>;
	  };

export interface AppState {
	history: HistoryEntry[];
	files: Record<string, File>;
	projectMetadata: Record<string, string>;
}

export const initialState: AppState = {
	history: [],
	files: {},
	projectMetadata: { title: "Untitled" },
};

export type AppAction =
	| { type: "APPEND_TEXT"; id: string; isFromUser: boolean; textDelta: string }
	| { type: "APPEND_THOUGHT"; id: string; textDelta: string }
	| { type: "PENDING_FILE_ACTION"; op: "create" | "update" | "delete" | "rename" | "read"; paths: string[] }
	| { type: "CREATE_FILE"; file: File }
	| { type: "UPDATE_FILE"; file: FileUpdate }
	| { type: "RENAME_FILE"; oldPath: string; newPath: string }
	| { type: "DELETE_FILE"; path: string; commitMessage: string }
	| { type: "READ_FILE"; path: string }
	| { type: "UPDATE_PROJECT_METADATA"; diff: Record<string, string> };
