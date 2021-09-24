import moment from 'moment';

export const getLocalToken = () => localStorage.getItem('token');

export const saveLocalToken = (token: string) => localStorage.setItem('token', token);

export const removeLocalToken = () => localStorage.removeItem('token');

export function saveSessionReportRequest(request: object) {
  sessionStorage.setItem('reportRequest', JSON.stringify(request));
}

export function getSessionReportRequest() {
  const result = sessionStorage.getItem('reportRequest');
  if (result === null) {
    return result;
  }
  return JSON.parse(result);
}

export function saveSessionWarehouseId(id: number) {
  sessionStorage.setItem('warehouseId', JSON.stringify(id));
}

export function getSessionWarehouseId() {
  const result = sessionStorage.getItem('warehouseId');
  if (result === null) {
    return result;
  }
  return JSON.parse(result);
}

// https://stackoverflow.com/a/20352387/10682164
export function binaryFind(array, searchElement) {
  let minIndex = 0;
  let maxIndex = array.length - 1;
  let currentIndex;
  let currentElement;

  while (minIndex <= maxIndex) {
    // tslint:disable-next-line:no-bitwise
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = array[currentIndex];

    if (currentElement === null) {
      minIndex = currentIndex + 1;
    } else if (currentElement < searchElement) {
      minIndex = currentIndex + 1;
    } else if (currentElement > searchElement) {
      maxIndex = currentIndex - 1;
    } else {
      return { // Modification
        found: true,
        index: currentIndex
      };
    }
  }

  return { // Modification
    found: false,
    index: (currentElement < searchElement || currentElement === null) ? currentIndex + 1 : currentIndex
  };
}

export function addSortedIfMissing(array, element) {
  if (array.length === 0) {
    array.push(element);
    return;
  }

  const res = binaryFind(array, element);
  if (!res.found) {
    array.splice(res.index, 0, element);
  }
  return res.index;
}

export const sortBy = (field) => {
  const key = (x) => {
    return x[field];
  };

  return (a, b) => {
    return ((key(a) > key(b)) as any) - ((key(b) > key(a)) as any);
  };
};

export const pp = (obj) => {
  console.log(JSON.stringify(obj, null, 4));
};

export class ValidationError extends Error {
  constructor(message = '') {
    super(message);
    this.name = 'ValidationError';
  }
}

function dateTypeToFormat(type) {
  if (type === 'date') {
    return 'YYYY-MM-DD';
  } else if (type === 'datetime') {
    return 'YYYY-MM-DD HH:mm:ss';
  }
  throw Error('Unrecognized type: ' + type);
}

export function getNDaysAgo(N, type) {
  return moment().subtract(N, 'day').startOf('day').format(dateTypeToFormat(type));
}

export function getDateStartOf(type, dateType) {
  return moment().startOf(type).format(dateTypeToFormat(dateType));
}

export function getDateEndOf(type, dateType) {
  return moment().endOf(type).format(dateTypeToFormat(dateType));
}

export function getToday(type) {
  return moment().startOf('day').format(dateTypeToFormat(type));
}

export function getTomorrow(type) {
  return moment().add(1, 'day').startOf('day').format(dateTypeToFormat(type));
}

export function getLastMonthStart(type) {
  return moment().startOf('month').subtract(1, 'month').format(dateTypeToFormat(type));
}

export function getLastMonthEnd(type) {
  return moment().startOf('month').subtract(1, 'day').format(dateTypeToFormat(type));
}
