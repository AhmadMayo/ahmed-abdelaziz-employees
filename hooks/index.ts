import { useWorker } from "@koale/useworker";
import { useEffect, useReducer } from "react";
import {
  CommonDurationPerProject,
  getPairWithHighestCommonDuration,
  getProjectsCommonDurationForPair,
  Row,
} from "../lib";

interface IdleState {
  status: "idle";
}
interface CalculatingPairWithHighestDurationState {
  status: "calculating-pair-with-highest-duration";
}
interface GettingPairProjectsDataState {
  status: "getting-pair-projects-data";
  employeeId1: string;
  employeeId2: string;
}
interface DoneState {
  status: "done";
  employeeId1: string;
  employeeId2: string;
  commonProjects: CommonDurationPerProject;
}

type State =
  | IdleState
  | CalculatingPairWithHighestDurationState
  | GettingPairProjectsDataState
  | DoneState;

interface StartCalculatingDurationsAction {
  type: "start-calculating-durations";
}
interface StartGettingPairProjectsDataAction {
  type: "start-getting-pair-projects-data";
  employeeId1: string;
  employeeId2: string;
}
interface PairProjectsDataRetrievedAction {
  type: "pair-projects-data-retrieved";
  projectsData: CommonDurationPerProject;
}
type Action =
  | StartCalculatingDurationsAction
  | StartGettingPairProjectsDataAction
  | PairProjectsDataRetrievedAction;

type ActionHandlers = {
  [actionType in Action["type"]]: (
    state: State,
    action: Extract<Action, { type: actionType }>
  ) => State;
};

const initialState: State = {
  status: "idle",
};

const actionHandlers: ActionHandlers = {
  "start-calculating-durations": () => ({
    status: "calculating-pair-with-highest-duration",
  }),
  "start-getting-pair-projects-data": (_, { employeeId1, employeeId2 }) => ({
    status: "getting-pair-projects-data",
    employeeId1,
    employeeId2,
  }),
  "pair-projects-data-retrieved": (state, { projectsData }) => ({
    status: "done",
    employeeId1: (state as GettingPairProjectsDataState).employeeId1,
    employeeId2: (state as GettingPairProjectsDataState).employeeId2,
    commonProjects: projectsData,
  }),
};

function reducer(state: State = initialState, action: Action): State {
  return actionHandlers[action.type]?.(state, action as any) || state;
}

function useProcessor(rows: Row[]) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // To mitigate that the implemented function are not the most performant implementation, they are
  // they are off-loaded to a webworker, so at least we have a better user experience.
  const [getPairWithHighestCommonDurationWorker] = useWorker(
    getPairWithHighestCommonDuration
  );
  const [getProjectsCommonDurationForPairWorker] = useWorker(
    getProjectsCommonDurationForPair
  );

  useEffect(() => {
    if (!rows.length) {
      return;
    }

    dispatch({ type: "start-calculating-durations" });
    getPairWithHighestCommonDurationWorker(rows)
      .then(([employeeId1, employeeId2]) => {
        dispatch({
          type: "start-getting-pair-projects-data",
          employeeId1,
          employeeId2,
        });

        return getProjectsCommonDurationForPairWorker(
          rows,
          employeeId1,
          employeeId2
        );
      })
      .then((commonDurationPerProject) =>
        dispatch({
          type: "pair-projects-data-retrieved",
          projectsData: commonDurationPerProject,
        })
      );
  }, [
    rows,
    getPairWithHighestCommonDurationWorker,
    getProjectsCommonDurationForPairWorker,
  ]);

  return state;
}

export default useProcessor;
