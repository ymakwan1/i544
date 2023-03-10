import * as C from './course-info.js';
import * as G from './grade-table.js';
import { okResult, errResult, ErrResult, Result } from 'cs544-js-utils';

export default function makeGrades(course: C.CourseInfo): G.Grades {
  return GradesImpl.make(course);
}

type RawRowsMap = { [rowId: string]: G.RawRow };

class GradesImpl implements C.CourseObj, G.Grades {
  readonly course: C.CourseInfo;
  readonly #colIds: Set<string>;
  readonly #rawRowsMap: RawRowsMap;
  #fullTable: G.FullTable;

  static make(course: C.CourseInfo): G.Grades {
    return new GradesImpl(course);
  }

  private constructor(course: C.CourseInfo, colIds: Set<string> = null,
    rawRowsMap: RawRowsMap = null) {
    //uncomment following line if no ts files shown in chrome debugger
    //debugger 
    this.course = course;
    this.#colIds = colIds;
    this.#rawRowsMap = rawRowsMap;
    this.#fullTable = null;
  }

  /** Add an empty column for colId to table. Note that this Grades
   *  object should not be changed.
   *  Errors:
   *    BAD_ARG: colId is already in table or is not a score/info/id colId
   *    for course.
   */
  addColumn(colId: string): Result<G.Grades> {
    const cols = this.course.cols;

    const colProp = cols[colId];
    if (!colProp || colProp.kind === 'calc' || this.#colIds.has(colId)) {
      return errResult(`'${colId}' is not a valid column to add`, 'BAD_ARG');
    }

    let newRawRowsMap: RawRowsMap = {};
    for (const [rowId, rawRow] of Object.entries(this.#rawRowsMap)) {
      newRawRowsMap[rowId] = {
        ...rawRow,
        ...{ [colId]: '' },
      };
    }

    newRawRowsMap = Object.fromEntries(Object.keys(newRawRowsMap)
      .map(key => [key, Object.fromEntries(Object.keys(newRawRowsMap[key])
        .sort((colId1, colId2) => cols[colId1].colIndex - cols[colId2].colIndex)
        .map(colId => [colId, newRawRowsMap[key][colId]]))
      ]));

    return okResult(new GradesImpl(this.course, new Set([...this.#colIds, colId]), newRawRowsMap));
  }

  /** Apply patches to table, returning the patched table.
   *  Note that this Grades object is not changed.
   *  Errors:
   *    BAD_ARG: A patch rowId or colId is not in table.
   *    RANGE: Patch data is out-of-range.
   */
  patch(patches: G.Patches): Result<G.Grades> {
    let err = new ErrResult();
    const colIds = this.#colIds;
    const rowIds = Object.keys(patches);


    // check for valid column ids and range constraints
    rowIds.forEach(rowId => {
      if (!this.#rawRowsMap.hasOwnProperty(rowId)) {
        err = err.addError("BAD rowId", "BAD_ARG");
      } else {
        const patchRow = patches[rowId];
        const existingRow = this.#rawRowsMap[rowId];
        const patchColIds = Object.keys(patchRow);
        patchColIds.forEach(colId => {
          if (!colIds.has(colId)) {
            err = err.addError(`unknown column id ${colId}`, 'BAD_ARG');
          } else if (colId !== this.course.rowIdColId && colId !== this.course.id) {
            const colProp = this.course.cols[colId];
            const patchValue = patchRow[colId];
            const existingValue = existingRow[colId];
            if (colProp.kind === 'score') {
              const { min, max } = colProp;
              if (typeof patchValue !== 'number' || patchValue < min || patchValue > max) {
                err = err.addError(`invalid patch value for ${colId} on row ${rowId}`, 'RANGE');
              }
            }
            if (colProp.kind === 'calc') {
              err = err.addError(`attempt to patch calculated column ${colId} on row ${rowId}`, 'BAD_ARG');
            }
          }
        });
      }
    });

    if (err.errors.length > 0) {
      return err;
    }

    // apply the patches
    let rawRowsMap = { ...this.#rawRowsMap };
    rowIds.forEach(rowId => {
      rawRowsMap = {
        ...rawRowsMap,
        [rowId]: { ...rawRowsMap[rowId], ...patches[rowId] }
      };
    });

    return okResult(new GradesImpl(this.course, colIds, rawRowsMap));

  }

  /** Return full table containing all computed values */
  getFullTable(): G.FullTable {
    //return null; //TODO
    if (this.#fullTable !== null) {
      return this.#fullTable;
    }

  //   const cols = this.course.cols;
  //   const colProp = cols;
  //   let newRawRow: any = [];
  //   const calcCols = Object.keys(cols).filter((col) => cols[col].kind === 'calc')
  //   calcCols.map((colId) => {
  //     let colProp = cols[colId]
  //     let v = Object.keys(this.#rawRowsMap);
  //     v.map(element => {
  //       const e = this.#rawRowsMap[element]
  //       let newrow: any = {};
  //       e[G.STAT_HDR] = "";
  //       if (colProp.kind === 'calc') {
  //         let result = colProp.fn(this.course, e);

  //         if (result.isOk) {
  //           newrow = { ...e };
  //           newrow[colProp.name] = result.val;
  //         }
  //       }
  //       const row1Pairs = Object.keys(newrow)
  //         .sort((colId1, colId2) => {
  //           if (colId1 === G.STAT_HDR) {
  //             return -1
  //           }
  //           else if(colId2 === G.STAT_HDR){
  //             return 1
  //           } else{
  //           cols[colId1].colIndex - cols[colId2].colIndex
  //           }
  //         })
  //         .map(colId => [colId, newrow[colId]]);
  //       //console.log(row1Pairs);
  //       const row1 = Object.fromEntries(row1Pairs);
  //       //const rawRowsMap = { ...this.#rawRowsMap, ...{ [rowId]: row1 } };
  //       newRawRow.push([[element],row1]);

  //     });
  //   })
  //  //console.log(newRawRow[0]);

  //   const colWork = newRawRow.map((e:any) => {
  //     console.log(e[0], e[1])
  //   });
  //   console.log(colWork)
    let fullTable=[];

    for(let [key,val] of Object.entries(this.#rawRowsMap)){

    	let newVal:any={"$stat":"",...val  };
    	fullTable.push(newVal);

    }

    fullTable=this.calculateColFns(fullTable, false);
    fullTable=this.calculateRowFns(fullTable);
    fullTable=this.calculateColFns(fullTable, true);

    return fullTable;
  }

  calculateRowFns(table: G.FullTable): G.FullTable {


    let colValues: any = {}

    table.forEach(row => {
      for (const [key, val] of Object.entries(row)) {
        if (!(key in colValues)) {
          colValues[key] = [];
        }

        colValues[key].push(val);
      }
    });
    for (const [key, val] of Object.entries(this.course.calcRows)) {
      let row: any = {};
      row["$stat"] = val.rowId

      this.#colIds.forEach((colId) => {
        if (this.getColKind(colId) === "score" || this.getColKind(colId) === "calc") {
          const result = val.fn(this.course, colValues[colId]);
          if (result.isOk)
            row[colId] = result.val;
        }
        else {
          row[colId] = "";
        }
      })

      table.push(row);

    }


    return table;
  }
  calculateColFns(table: G.FullTable, calcTotal: boolean): G.FullTable {

    let fullTable: G.FullTable = []

    let colFns: any = [];

    for (let [col, colDetail] of Object.entries(this.course.cols)) {
      if (colDetail.kind === 'calc') {
        colFns.push(colDetail);
      }
    }
    let err = new ErrResult();
    table.forEach((row) => {
      let newRow = { ...row };
      colFns.forEach((fn: any) => {
        const result = fn.fn(this.course, row);
        if (result.isOk) {
          newRow[fn.colId] = result.val;
        }
        else {
          err = err.addError(result);
        }
      })
      
      fullTable.push(newRow);
    })
    if (!calcTotal) {
      this.#fullTable = fullTable; // cache the computed full table
    }

    return fullTable;
  }
  getColKind(colId: string): string {
    for (let [col, colDetail] of Object.entries(this.course.cols)) {
      if (colDetail.colId === colId) {
        return colDetail.kind;
      }
    }

    return "";
  }

  /** Return a raw table containing the raw data.  Note that all
   *  columns in each retrieved row must be in the same order
   *  as the order specified in the course-info cols property.
   */
  getRawTable(): G.RawTable {
    return this.#colIds === null ? [] : Object.values(this.#rawRowsMap);
  }

  /** Upsert (i.e. insert or replace) row to table and return the new
   *  table.  Note that this Grades object should not be 
   *  modified at all.  The returned Grades may share structure with
   *  this Grades object  and row being upserted.
   *
   *  Error Codes:
   *
   *   'BAD_ARG': row specifies an unknown colId or a calc colId or
   *              contains an extra/missing colId not already in table,
   *              or is missing an id column course.colidentifying the row.
   *   'RANGE':   A kind='score' column value is out of range
   */
  upsertRow(row: G.RawRow): Result<G.Grades> {
    const cols = this.course.cols;
    const rowColIds = Object.keys(row);
    const colIds = (this.#colIds) ? this.#colIds : new Set<string>(rowColIds);
    const addColIds = rowColIds.filter(colId => !colIds.has(colId));
    const missColIds =
      [...colIds].filter(colId => rowColIds.indexOf(colId) < 0);
    let err = new ErrResult();
    //console.log(colIds, rowColIds, addColIds, missColIds);
    if (addColIds.length > 0) {
      err = err.addError(`new columns ${addColIds.join(', ')}`, 'BAD_ARG');
    }
    if (missColIds.length > 0) {
      err = err.addError(`missing columns ${missColIds.join(', ')}`, 'BAD_ARG');
    }
    let rowId: string;
    for (const [colId, val] of Object.entries(row)) {
      if (val === undefined || val === null) {
        const msg = `${colId} is ${row[colId] === null ? 'null' : 'undefined'}`;
        err = err.addError(msg, 'BAD_ARG');
      }
      const colProp = cols[colId];
      if (colProp === undefined) {
        err = err.addError(`unknown column ${colId}`, 'BAD_ARG');
      }
      else if (colProp.kind === 'id') {
        if (typeof val === 'string') rowId = val as string;
      }
      else if (colProp.kind === 'calc') {
        err = err.addError(`attempt to add data for calculated column ${colId}`,
          'BAD_ARG');
      }
      else if (colProp.kind === 'score') {
        const { min, max } = colProp;
        const val = row[colId];
        if (typeof val === 'number' && (val < min || val > max)) {
          const msg = `${colId} value ${val} out of range [${min}, ${max}]`;
          err = err.addError(msg, 'RANGE');
        }
      }
    }
    if (rowId === undefined) {
      err = err.addError(`no entry for ID column ${this.course.rowIdColId}`,
        'BAD_ARG');
    }
    if (err.errors.length > 0) {
      return err;
    }
    else {
      const row1Pairs = Object.keys(row)
        .sort((colId1, colId2) => cols[colId1].colIndex - cols[colId2].colIndex)
        .map(colId => [colId, row[colId]]);
      const row1 = Object.fromEntries(row1Pairs);
      const rawRowsMap = { ...this.#rawRowsMap, ...{ [rowId]: row1 } };
      return okResult(new GradesImpl(this.course, colIds, rawRowsMap));
    }

  } //upsertRow

  //TODO: add auxiliary private methods as needed
}

//TODO: add auxiliary functions as needed

