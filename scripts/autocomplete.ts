/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */

import fuzzysort from "fuzzysort";
import * as phonetics from "phonetics";
import Fuse from "fuse.js";
import { Listener } from "./Listener";

/**
 *
 * @param inputElement must be part of a form
 * @returns the save address
 */
function saveAddress(inputElement: HTMLInputElement, formState?: string): string {
  return (
    formState + "->" + inputElement.form?.name ?? "notInForm" + "->" + inputElement.name + "->" + "last autocompletes"
  );
}

export function loadLastSubmittedValues(inputElement: HTMLInputElement, formState: string = ""): string[] {
  let tmp: string = window.localStorage.getItem(saveAddress(inputElement, formState)) ?? "";
  if (!tmp) {
    return [];
  } else {
    return JSON.parse(tmp) as string[];
  }
}

/**
 *
 * @param inputElement the element of the form to save
 * @param keep The number of values to keep
 */
export function saveLastSubmittedValue(
  inputElement: HTMLInputElement,
  formState: string = "",
  manualValue: string | undefined = undefined,
  keep: number = 5
) {
  let tmp: string[] = loadLastSubmittedValues(inputElement, formState);
  let value: string;
  if (manualValue !== undefined) {
    value = manualValue;
  } else {
    value = inputElement.value;
  }

  if (tmp[0] === value) {
    return;
  }

  for (let i = 1; i < tmp.length; i++) {
    const element = tmp[i];
    if (element === value) {
      tmp.splice(i, 1);
      break;
    }
  }

  if (value != "") tmp.unshift(value);
  else return;

  if (tmp.length > keep) {
    tmp.pop();
  }

  window.localStorage.setItem(saveAddress(inputElement, formState), JSON.stringify(tmp));
}

export function removeAutocomplete(eventList: Listener[] | undefined): Listener[] | undefined {
  if (!eventList || eventList.length == 0) return;
  let x: Listener | undefined;
  while ((x = eventList.pop())) {
    x.removeListener();
  }
  _autoCompCount--;
  return eventList;
}

interface CustomSort {
  displayName?: string;
  item: string;
  distance: number;
  sortObj?: Fuzzysort.Result;
}

let autocompleteUp: boolean = false;
export function autocompleteIsUp(): boolean {
  return autocompleteUp;
}

function displayAndHighlightLetters(sortedArr: readonly CustomSort[], i: number, b: HTMLElement) {
  if (sortedArr[i].sortObj) {
    b.innerHTML = fuzzysort.highlight(sortedArr[i].sortObj) ?? sortedArr[i].sortObj?.target ?? "";
  } else {
    b.innerHTML = sortedArr[i].displayName ? sortedArr[i].displayName ?? "" : sortedArr[i].item;
  }
}

function sort(sortedArr: CustomSort[]) {
  sortedArr = sortedArr.sort((a, b) => {
    if (a.distance == b.distance) return 0;
    return a.distance > b.distance ? -1 : 1;
  });
}

function selectOnKeypress(x: HTMLElement[], inputElement: HTMLInputElement, currentFocus: number) {
  if (currentFocus < 0) return;
  if (x !== undefined && x.length > currentFocus) selectAutocompleteItem(inputElement, x[currentFocus], false);
  if (currentFocus < 0 || x.length <= currentFocus) closeAllLists();
  inputElement.scrollIntoView({ block: "center" });
}

function removeActive(x: HTMLElement[]) {
  /*a function to remove the "active" class from all autocomplete items:*/
  for (var i = 0; i < x.length; i++) {
    x[i].classList.remove("autocomplete-active");
  }
}

function closeOnNavAway(e: MouseEvent) {
  closeAllLists(e.target as HTMLElement);
}

function closeAllLists(elmnt: HTMLElement | undefined = undefined) {
  /*close all autocomplete lists in the document,
  except the one passed as an argument:*/
  let anyLeft: boolean = false;
  var x = document.getElementsByClassName("autocomplete-items");

  for (var i = 0; i < x.length; i++) {
    if (elmnt != x[i] && elmnt != currentAutoCompInputElement && elmnt?.parentElement != currentAutoCompInputElement) {
      x[i].parentNode!.removeChild(x[i]);
    } else {
      anyLeft = true;
    }
  }

  if (anyLeft) {
    autocompleteUp = true;
  } else {
    // wait for all events to resolve before setting
    setTimeout(() => (autocompleteUp = false), 50);
  }
}

function selectAutocompleteItem(
  inputElement: HTMLInputElement,
  selectedElmFromList: HTMLElement,
  refocusInput: boolean
) {
  /*insert the value for the autocomplete text field:*/
  inputElement.value = selectedElmFromList.getElementsByTagName("input")[0].value;
  // Send changed event so data validation can be done
  inputElement.dispatchEvent(new Event("input"));
  /*close the list of autocompleted values,
    (or any other open lists of autocompleted values:*/
  closeAllLists();
  if (refocusInput)
    setTimeout(() => {
      inputElement.focus();
    }, 1);
}

function addActive(x: HTMLElement[] | undefined, currentFocus: number, inputElement: HTMLInputElement): number {
  /*a function to classify an item as "active":*/
  if (!x) return currentFocus;
  /*start by removing the "active" class on all items:*/
  removeActive(x);
  if (currentFocus >= x.length + 1) currentFocus = 0;
  if (currentFocus < -1) currentFocus = x.length - 1;
  /*add class "autocomplete-active":*/
  if (!(currentFocus >= 0 && currentFocus < x.length)) {
    inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    x[currentFocus].classList.add("autocomplete-active");
    x[currentFocus].scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return currentFocus;
}

class Listener_Autocomplete extends Listener {
  autoCompContainerId: string;

  constructor(id: string, elm: HTMLElement | Document, eventName: string, func: (e: Event) => void, noStart?: boolean) {
    super(elm, eventName, func, noStart);
    this.autoCompContainerId = id;
  }

  removeListener(): void {
    super.removeListener();
    let elm = document.getElementById(this.autoCompContainerId);
    elm?.replaceChildren();
    elm?.remove();
  }
}

let _autoCompCount: number = 0;
export function autocompleteCount() {
  return _autoCompCount;
}
let currentAutoCompInputElement: HTMLInputElement;
// base code from https://www.w3schools.com/howto/howto_js_autocomplete.asp
/**
 * Only one autocomplete can be open at a time.
 *
 * @param inputElement
 * @param _arr
 * @param maxList
 * @param formState
 * @param showAll
 * @param otherNames
 * @returns
 */
export function autocomplete(
  inputElement: HTMLInputElement,
  _arr: readonly string[],
  maxList: number,
  formState: string,
  showAll: boolean = false,
  otherNames?: { idName: string; otherName: string }[]
): Listener[] | undefined {
  if (!inputElement.parentElement?.classList.contains("autocomplete")) {
    console.error("Not valid autocomplete element." + JSON.stringify(inputElement));
    return undefined;
  }
  if(_arr.length == 0){
    console.warn(`sort array length is 0 for element id (${inputElement.id}) `)
  }

  //use a new array every time since it may be modified
  const arr = Array.from(_arr);
  if (otherNames) {
    for (const item of otherNames) {
      if (arr.find((x) => x == item.idName)) arr.push(item.otherName);
    }
  }

  let listenerRemovalList: Listener[] = [];

  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus: number;
  //let sortedArr: Fuzzysort.Results;
  let sortedArr: CustomSort[] = [];
  let lastEntered: string[] = [];

  function autocompleteInputListener(this: HTMLInputElement, e: Event) {
    let a: HTMLElement,
      b: HTMLElement,
      i: number,
      val = this.value;
    let maxListConst = maxList;
    /*close any already open lists of autocompleted values*/
    sortedArr = [];
    currentAutoCompInputElement = inputElement;
    lastEntered = loadLastSubmittedValues(currentAutoCompInputElement, formState);
    currentFocus = 0;
    closeAllLists();
    let showRecent = false;
    if (val === "") {
      showRecent = true;
    } else if (!val) {
      return false;
    }

    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    let id = this.id + "autocomplete-list";
    a.setAttribute("id", id);
    a.classList.add("autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentElement!.appendChild(a);

    if ((!showRecent && showAll && val == "") || (showAll && arr.findIndex((x) => x == val) > 0)) {
      sortedArr = Array.from(arr).map((x) => {
        return { item: x, distance: 0 } as CustomSort;
      });
      for (let i = 0; i < sortedArr.length; i++) {
        const item = sortedArr[i];
        if (item.item === val) {
          currentFocus = i;
        }
      }
    } else if (showRecent && !showAll) {
      sortedArr = lastEntered.map((x) => {
        return { item: x, distance: 0 } as CustomSort;
      });
    } else {
      // compute search for array
      sortedArr = fuzzysort
        .go(val.toLowerCase(), arr, { all: true, limit: maxListConst, threshold: -Infinity })
        .map((x) => {
          return { item: x.target, distance: x.score, sortObj: x };
        });

      sort(sortedArr);
      if (sortedArr.length == 0) {
        sortedArr = arr
          .filter((x) => {
            let trueAny: boolean = false;
            let words = x.split(" ");
            if (words.length > 1) {
              for (const word of words) {
                trueAny = trueAny || phonetics.doubleMetaphoneMatch(val, word);
              }
              return trueAny;
            } else return phonetics.doubleMetaphoneMatch(val, x);
          })
          .map((x) => {
            return { item: x, distance: 0 };
          });
        sort(sortedArr);
        if (sortedArr.length == 0) {
          // last resort search using fuse
          const fuseInst = new Fuse(arr, { includeScore: true, distance: 200 });
          sortedArr = fuseInst.search(val, { limit: maxListConst }).map((x) => {
            return { item: x.item, distance: -x.score! };
          });
          sort(sortedArr);
        }
      }
      if (sortedArr.length == 0) {
        sortedArr = Array.from(arr).map((x) => {
          return { item: x, distance: 0 } as CustomSort;
        });
      }
    }
    // If the source is already valid show all options up to maxList
    if (sortedArr.length == 1 && sortedArr[0].item == val) {
      currentFocus = -1; // prevent accidental overwrite of wanted item
      const main: HTMLElement[] | undefined = document
        .getElementById(this.id + "autocomplete-list")
        ?.getElementsByTagName("div") as any;

      sortedArr = Array.from(arr).map((x) => {
        return { item: x, distance: 0 } as CustomSort;
      });
      for (let i = 0; i < sortedArr.length; i++) {
        const item = sortedArr[i];
        if (item.item === val) {
          currentFocus = i;
        }
      }
      if (currentFocus > maxListConst) {
        // show items around the current one
        sortedArr = sortedArr.slice(
          currentFocus - Math.floor(maxListConst * 0.5),
          currentFocus + Math.ceil(maxListConst * 0.5) + 1
        );
        currentFocus = Math.ceil(maxListConst * 0.5) - 1;
      }
      currentFocus = addActive(main, currentFocus, inputElement);
    } else if (sortedArr.length < maxListConst) {
      maxListConst = sortedArr.length;
    }

    if (maxListConst > sortedArr.length) {
      maxListConst = sortedArr.length;
    }

    if (otherNames) {
      for (const name of otherNames) {
        let i = sortedArr.findIndex((x) => x.item == name.otherName);
        if (i > -1) {
          sortedArr[i].displayName = sortedArr[i].item;
          sortedArr[i].item = name.idName;
        }
      }
    }

    //console.log(sortedArr);
    for (i = 0; i < maxListConst; i++) {
      /*create a DIV element for each matching element:*/
      b = document.createElement("DIV");
      b.classList.add("autocompListItem");
      if (sortedArr[i].displayName && sortedArr[i].displayName !== "") {
        displayAndHighlightLetters(sortedArr, i, b);
        b.style.backgroundColor = "#fcffc2";
      } else displayAndHighlightLetters(sortedArr, i, b);
      /*insert a input field that will hold the current array item's value:*/
      b.innerHTML += "<input type='hidden' value='" + sortedArr[i].item + "'>";
      /*execute a function when someone clicks on the item value (DIV element):*/
      const tmp = b;
      b.addEventListener("mousedown", () => selectAutocompleteItem(inputElement, tmp, true));
      a.appendChild(b);
    }
    const main: HTMLElement[] | undefined = document
      .getElementById(this.id + "autocomplete-list")
      ?.getElementsByTagName("div") as any;
    currentFocus = addActive(main, currentFocus, inputElement);
    autocompleteUp = true;
  }

  function keydownInputListener(this: any, e: KeyboardEvent) {
    const main = document.getElementById(this.id + "autocomplete-list");
    let x: HTMLElement[];
    if (main) {
      x = main.getElementsByTagName("div") as any;
    } else {
      return;
    }
    if (e.key == "ArrowDown") {
      /*If the arrow DOWN key is pressed,
      increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      currentFocus = addActive(x, currentFocus, inputElement);
    } else if (e.key == "ArrowUp") {
      /*If the arrow UP key is pressed,
      decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      currentFocus = addActive(x, currentFocus, inputElement);
    } else if (e.code == "Enter" || e.code == "NumpadEnter") {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      /*and simulate a click on the "active" item:*/
      selectOnKeypress(x, inputElement, currentFocus);
    } else if (e.code == "Tab") {
      // When tabbing try to get a valid value even when nothing is selected
      if ((this as HTMLInputElement)?.value === "") {
        if (currentFocus < 0 || currentFocus >= x?.length) {
          currentFocus = 0;
          currentFocus = addActive(x, currentFocus, inputElement);
        }
      }

      selectOnKeypress(x, inputElement, currentFocus);
    } else if (e.code == "Escape") {
      closeAllLists();
    }
  }

  /*execute a function when someone writes in the text field:*/
  listenerRemovalList.push(new Listener(inputElement, "input", autocompleteInputListener));
  // or selects it
  listenerRemovalList.push(new Listener(inputElement, "focus", autocompleteInputListener));
  /*execute a function presses a key on the keyboard:*/
  listenerRemovalList.push(new Listener(inputElement, "keydown", keydownInputListener as (e: Event) => void));

  /*execute a function when someone clicks in the document:*/
  listenerRemovalList.push(new Listener(document, "mousedown", closeOnNavAway as (e: Event) => void));

  _autoCompCount++;
  return listenerRemovalList;
}
