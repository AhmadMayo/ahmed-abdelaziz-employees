import moment from "moment";

// Type aliases, just to add meaning to types
type EmployeeId = string;
type ProjectId = string;
type FromTimestamp = number;
type ToTimestamp = number;

export type Row = [EmployeeId, ProjectId, FromTimestamp, ToTimestamp];
export type CommonDurationPerProject = {
  [projectId: ProjectId]: number;
};

export function convertTextToRows(text: string): Row[] {
  return text.split(/\r|\n|\r\n/).reduce((rows, rowString) => {
    if (!rowString) {
      return rows;
    }

    const [employeeId, projectId, dateFromStr, dateToStr] =
      rowString.split(", ");

    rows.push([
      employeeId,
      projectId,
      moment(dateFromStr).valueOf(),
      dateToStr == "NULL"
        ? moment().endOf("day").valueOf()
        : moment(dateToStr).valueOf(),
    ]);

    return rows;
  }, [] as Row[]);
}

// Due to the way `useWorker` works, and how JS code is transpiled, using the functions directly in
// the worker results in weird errors.
// Create a function from the text content of the original function will prevent the transpiler
// from changing our code.
export const getPairWithHighestCommonDuration = new Function(
  "rows",
  `
  // get all unique employee ids
  const employeesIds = new Set();
  for (const [employeeId] of rows) {
    employeesIds.add(employeeId);
  }

  // calculate all possible pairs
  const durationsPerPair = {};
  for (const employeeId1 of employeesIds) {
    for (const employeeId2 of employeesIds) {
      if (employeeId1 == employeeId2) {
        continue;
      }

      const key = [employeeId1, employeeId2].sort().join("-");
      durationsPerPair[key] ??= 0;
    }
  }

  // calculate common duration between all pairs across all projects
  for (const [employeeId1, projectId1, from1, to1] of rows) {
    for (const [employeeId2, projectId2, from2, to2] of rows) {
      // Ignore if it's the same employee
      if (employeeId1 == employeeId2) {
        continue;
      }
      // Ignore if it's not the same project
      if (projectId1 != projectId2) {
        continue;
      }
      // Ignore if there's no common duration
      if (from1 > to2 || from2 > to1) {
        continue;
      }

      const commonFrom = from1 > from2 ? from1 : from2;
      const commonTo = to1 < to2 ? to1 : to2;
      const key = [employeeId1, employeeId2].sort().join("-");

      durationsPerPair[key] += commonTo - commonFrom;
    }
  }

  // get the highest common duration between pairs
  const sortedPairs = Object.entries(durationsPerPair).sort(
    ([_1, duration1], [_2, duration2]) => (duration1 < duration2 ? -1 : 1)
  );
  const [pairWithHighestCommonDuration, _] = sortedPairs.pop();

  return pairWithHighestCommonDuration.split("-");
  `
) as (rows: Row[]) => [EmployeeId, EmployeeId];

export const getProjectsCommonDurationForPair = new Function(
  "rows",
  "employeeId1",
  "employeeId2",
  `
  const dataPerProject = {};

  // group data by project id
  for (const [employeeId, projectId, from, to] of rows) {
    if (![employeeId1, employeeId2].includes(employeeId)) {
      continue;
    }

    dataPerProject[projectId] ??= {}

    dataPerProject[projectId][employeeId] = [from, to];
  }

  // calculate duration where both employees were working on the same project
  const commonDurationPerProject = {};
  for (const projectId in dataPerProject) {
    const projectData = dataPerProject[projectId];
    if (!projectData[employeeId1] || !projectData[employeeId2]) {
      continue;
    }

    const [from1, to1] = projectData[employeeId1];
    const [from2, to2] = projectData[employeeId2];
    // Ignore if there's no common duration
    if (from1 > to2 || from2 > to1) {
      continue;
    }

    const commonFrom = from1 < from2 ? from2 : from1;
    const commonTo = to1 < to2 ? to1 : to2;

    commonDurationPerProject[projectId] = commonTo - commonFrom;
  }

  return commonDurationPerProject;
`
) as (
  rows: Row[],
  employeeId1: EmployeeId,
  employeeId2: EmployeeId
) => CommonDurationPerProject;
