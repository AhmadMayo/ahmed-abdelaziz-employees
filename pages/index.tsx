import { useState } from "react";
import type { NextPage } from "next";
import { Row, convertTextToRows } from "../lib";
import useProcessor from "../hooks";
import moment from "moment";

const Home: NextPage = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const processedData = useProcessor(rows);

  return (
    <main className="p-4">
      <div className="flex justify-center">
        <input
          type="file"
          accept=".csv"
          className="
            text-lg
            text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100
          "
          onChange={(event) => {
            const reader = new FileReader();
            reader.onload = function (e) {
              const result = e.target!.result as string;

              const rows = convertTextToRows(result);
              setRows(rows);
            };

            reader.readAsText(event.target.files![0]);
          }}
        />
      </div>
      <br />
      <div className="flex justify-center">
        {processedData.status == "idle" && (
          <span>Please upload a CSV file</span>
        )}

        {processedData.status == "calculating-pair-with-highest-duration" && (
          <span>
            Calculating which pair of employees worked together for the longest
            period of time.
          </span>
        )}

        {processedData.status == "getting-pair-projects-data" && (
          <span>
            Retrieving the data of the projects which the employees worked
            together.
          </span>
        )}

        {processedData.status == "done" && (
          <table className="table-auto border-collapse">
            <thead>
              <tr>
                <th className="border-b font-medium p-4 pl-8 pt-0 pb-3 text-slate-600 text-left">
                  Employee ID #1
                </th>
                <th className="border-b font-medium p-4 pl-8 pt-0 pb-3 text-slate-600 text-left">
                  Employee ID #2
                </th>
                <th className="border-b font-medium p-4 pl-8 pt-0 pb-3 text-slate-600 text-left">
                  Project ID
                </th>
                <th className="border-b font-medium p-4 pl-8 pt-0 pb-3 text-slate-600 text-left">
                  Days Worked
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(processedData.commonProjects).map(
                ([projectId, duration]) => (
                  <tr key={projectId}>
                    <td className="border-b border-slate-100 p-4 pl-8 text-slate-800">
                      {processedData.employeeId1}
                    </td>
                    <td className="border-b border-slate-100 p-4 pl-8 text-slate-800">
                      {processedData.employeeId2}
                    </td>
                    <td className="border-b border-slate-100 p-4 pl-8 text-slate-800">
                      {projectId}
                    </td>
                    <td className="border-b border-slate-100 p-4 pl-8 text-slate-800">
                      {moment.duration(duration).asDays()}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
};

export default Home;
