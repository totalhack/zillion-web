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

function getCoords(elem) {
  const box = elem.getBoundingClientRect();
  return {
    top: box.top + window.pageYOffset,
    right: box.right + window.pageXOffset,
    bottom: box.bottom + window.pageYOffset,
    left: box.left + window.pageXOffset
  };
}

export function focusAndOpenKeyboard(el, timeout) {
  // Adapted from: https://stackoverflow.com/a/55425845/10682164
  if (!timeout) {
    timeout = 100;
  }
  if (el) {
    // Align temp input element approximately where the input element is
    // so the cursor doesn't jump around
    const tempEl = document.createElement('input');
    const coords = getCoords(el);
    tempEl.style.position = 'absolute';
    tempEl.style.top = (coords.top + 7) + 'px';
    tempEl.style.left = coords.left + 'px';
    tempEl.style.height = '0';
    tempEl.style.opacity = '0';
    // Put this temp element as a child of the page <body> and focus on it
    document.body.appendChild(tempEl);
    tempEl.focus();

    // The keyboard is open. Now do a delayed focus on the target element
    setTimeout(() => {
      el.focus();
      el.click();
      document.body.removeChild(tempEl);
    }, timeout);
  }
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

export function getNHoursAgo(N, type) {
  return moment().subtract(N, 'hour').startOf('hour').format(dateTypeToFormat(type));
}

export function getNMinutesAgo(N, type) {
  return moment().subtract(N, 'minute').startOf('minute').format(dateTypeToFormat(type));
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

export function getThisHour(type) {
  return moment().startOf('hour').format(dateTypeToFormat(type));
}

export function getLastMonthStart(type) {
  return moment().startOf('month').subtract(1, 'month').format(dateTypeToFormat(type));
}

export function getLastMonthEnd(type) {
  return moment().startOf('month').subtract(1, 'day').format(dateTypeToFormat(type));
}
