import { Listener } from "./Listener";
import * as Autocomplete from "./autocomplete";
import localforage from "localforage";
import * as helpers from "./helpers";

const goodSubmitFlash = "goodSubmitFlash";
const badSubmitFlash = "badSubmitFlash";
function playAnimation(element: HTMLElement, animationName: string) {
    element.setAttribute("class", "");
    setTimeout(()=>{ element.setAttribute("class", animationName); }, 100)    
}

// #region loadHtmlElements
const dateArrived = document.getElementById("dateArrived") as HTMLInputElement;
dateArrived.addEventListener("change", (e) => {
    let today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let setDate = dateArrived.valueAsDate;

    if(
        today.getUTCFullYear() == setDate.getUTCFullYear() &&
        today.getUTCMonth() == setDate.getUTCMonth() &&
        today.getUTCDate() == setDate.getUTCDate()
    ) {
        dateArrived.style.removeProperty("background");
    }else{
        dateArrived.style.background = "yellow";
    }
});

const storeName = document.getElementById("storeName") as HTMLInputElement;
const weightInput = document.getElementById("weight") as HTMLInputElement;
weightInput.value = "0";
// only called when the user changes.
weightInput.addEventListener("input", (e) => {
    manualWeight.checked = true;
    manualWeight.dispatchEvent(new Event("change"));
});

const manualWeight = document.getElementById("manualWeight") as HTMLInputElement;
manualWeight.addEventListener("change", (e) => {
    if (manualWeight.checked) {
    manualWeight.setAttribute("tabindex", "0")
    } else {
    manualWeight.setAttribute("tabindex", "-1")
  }
});

let binCountDefaultValue = "1";
const binCountInput = document.getElementById("binCount") as HTMLInputElement;
binCountInput.value = binCountDefaultValue;

const foodTypeSelect = document.getElementById("foodType") as HTMLFieldSetElement;

const editableFieldType = ["text", "number", "date"];
document.addEventListener('keydown', (event) => {
    let elmType = document.activeElement?.getAttribute("type");    
    if (elmType != null && editableFieldType.includes(elmType)) {
        return;
    }

    const key = event.key;
    if (key >= '1' && key <= '9') {
      const index = parseInt(key) - 1;
      const radioButtons = foodTypeSelect.querySelectorAll('input[type="radio"]')
      if (index < radioButtons.length) {
        (radioButtons[index] as HTMLInputElement).checked = true;
      }
    } else if (key == 'q' || key == '-') {
        binCountInput.value = (binCountInput.valueAsNumber - 1).toString();            
        if(binCountInput.value == "" || binCountInput.valueAsNumber < 0) binCountInput.value = "0";
    } else if (key == 'w' || key == '+') {
        binCountInput.value = (binCountInput.valueAsNumber + 1).toString();
        if(binCountInput.value == "") binCountInput.value = "1";
    } else if (key == "/") {
        const elm = compostSelect;
        if (elm && elm.type == "checkbox") {
            elm.checked = !elm.checked; 
        }
    }
});


const compostSelect = document.getElementById("compost") as HTMLInputElement;
const submitButton = document.getElementById("submitButton") as HTMLInputElement;

//#endregion loadHtmlElements
abstract class Column {
    columnName: string;
    columnIndex: number;
    formHtmlObject: HTMLElement;
    getColumnDataFromForm(): string {return (this.formHtmlObject as HTMLInputElement).value};
    setFormFromColumnData(value: string): void { (this.formHtmlObject as HTMLInputElement).value = value }
    validate(): boolean {return defaultValidate(this)};
    validateAndAlertUser(): boolean {return defaultValidateAndAlert(this)};
}

function defaultValidate(column: Column): boolean {
    return !!column.getColumnDataFromForm();
}

function defaultValidateAndAlert(column:Column): boolean {
    if(!column.validate()){
        playAnimation(form, badSubmitFlash);
        alert(`${column.columnName} not valid`);
        return false;
    }
    
    return true;
}

function defaultGetValueForNumber(column: Column): string {
    const numberValue = (column.formHtmlObject as HTMLInputElement).valueAsNumber; 
    return  numberValue ? numberValue.toString() : "0";
}

function defaultGetValueForRadioButtons(column: Column): string {
    const selectedRadio = column.formHtmlObject.querySelector('input[type=radio]:checked') as HTMLInputElement;    
    return selectedRadio?.value; 
}

let _headerCount = 0;
let headers = {
date: new class ArrivedDate extends Column {
    columnName: string = "Date";
    columnIndex: number = _headerCount++;
    formHtmlObject: HTMLElement = dateArrived;
    setFormFromColumnData(value: string): void {
        (this.formHtmlObject as HTMLInputElement).valueAsDate = new Date(value);
    }
},
store: new class Store extends Column {
    columnName: string = "Store";
    columnIndex: number = _headerCount++;
    formHtmlObject: HTMLElement = storeName;
    validate(): boolean {
        if(validateStoreFromList.checked) {
            return storeNames.findIndex((x) => {return x == this.getColumnDataFromForm()}) !== -1;
        }        
        return true;
    }
},
weight: new class Weight extends Column {
    columnName: string = "Weight";
    columnIndex: number = _headerCount++;
    formHtmlObject: HTMLElement = weightInput;
    getColumnDataFromForm(): string { return defaultGetValueForNumber(this); }
},
bins: new class Bins extends Column {
    columnName: string = "Bins";
    columnIndex: number = _headerCount++;
    formHtmlObject: HTMLElement = binCountInput;
    getColumnDataFromForm(): string { return defaultGetValueForNumber(this); }    
},
foodType: new class FoodType extends Column {
    columnName: string = "Food Type";
    columnIndex: number = _headerCount++;
    formHtmlObject: HTMLElement = foodTypeSelect;
    getColumnDataFromForm(): string { return defaultGetValueForRadioButtons(this) }
    setFormFromColumnData(value: string): void {
        try{
            (this.formHtmlObject.querySelector(`input[type=radio][value=${value}]`) as HTMLInputElement).checked = true;
        }catch{
            console.error("No Food Type for a column");            
        }
    }
},
compost: new class Compost extends Column {
    columnName: string = "Compost";
    columnIndex: number = _headerCount++;
    formHtmlObject: HTMLElement = compostSelect;
    getColumnDataFromForm(): string { return (this.formHtmlObject as HTMLInputElement).checked ? compostSelectedTrueOption : "" }
    validate(): boolean { return true }
    setFormFromColumnData(value: string): void {
        (this.formHtmlObject as HTMLInputElement).checked = value == compostSelectedTrueOption;
    }
}
}

const headersArray = Object.values(headers);
function getFormValues(): string[] {
    return headersArray.map((x) => {return x.getColumnDataFromForm()});
}

// edit modeEvent
for (const column of headersArray) {
    // TODO: not working for all types.
    column.formHtmlObject.addEventListener("input", (e) => {
        editUpdate(column.columnIndex, column.getColumnDataFromForm());
    })
}

const tableHeaders = document.getElementById("tableHeaders") as HTMLTableRowElement;
{
    let headersHtml = '';
    for (const header of headersArray) {
        headersHtml += `<th>${header.columnName}</th>
        `;
    }
    tableHeaders.innerHTML = headersHtml;
}


function getTableHeaders() {
    return [...(weightsTable.tHead.rows[0] as HTMLTableRowElement).children].map((x) => { return x.textContent; });
}

const TRUE = "true";
// Get CSV elements
const csvDataTextarea = document.getElementById("csv-data") as HTMLTextAreaElement;
const storeToFoodMeshCodeTextArea = document.getElementById("storeToFoodMeshCode") as HTMLTextAreaElement;
const toggleCsvButton = document.getElementById("toggle-csv") as HTMLButtonElement;
const csvDataAreaDiv = document.getElementById("csvStoreDataDiv") as HTMLDivElement;

function checkboxOption(checkbox: HTMLInputElement) {
    checkbox.addEventListener("change", (e) => {
        localStorage.setItem(checkbox.id, checkbox.checked ? TRUE : "false");
    });
    if (localStorage.getItem(checkbox.id) === TRUE) {
        checkbox.checked = true;
    }
}

const keepBinCount = document.getElementById("keepBinCount") as HTMLInputElement;
checkboxOption(keepBinCount);
const keepLastFoodType = document.getElementById("keepLastFoodType") as HTMLInputElement;
checkboxOption(keepLastFoodType);
const validateStoreFromList = document.getElementById("validateStore") as HTMLInputElement;
checkboxOption(validateStoreFromList);

const binWeight = document.getElementById("binWeight") as HTMLInputElement;
binWeight.addEventListener("change", (e) => {
    localStorage.setItem(binWeight.id, binWeight.value);
});

binWeight.value = localStorage.getItem(binWeight.id) ?? "7";



// Get form elements
const form = document.getElementById("weightsForm") as HTMLFormElement;

const connectToScale = document.getElementById("scaleConnect") as HTMLButtonElement;
connectToScale.addEventListener("click", async (e) => {
    await addScalePort();
});


const weightsTable = document.getElementById("weightsTable") as HTMLTableElement;
dateArrived.valueAsDate = new Date();

// Handle toggle CSV button click
toggleCsvButton.addEventListener("click", () => {
    // Toggle textarea visibility
    if (csvDataAreaDiv.style.display === "none") {
        csvDataAreaDiv.style.display = "block";
        // toggleCsvButton.textContent = "Hide CSV Data";
    } else {
        csvDataAreaDiv.style.display = "none";
        // toggleCsvButton.textContent = "Show CSV Data";
    }
});

let storeNames: string[] = [];
const localStorage_storeNames = "storeNames";

class FoodMeshData {
    foodMeshName: string;
}

let storeFoodMeshCodes: Map<string, FoodMeshData> = new Map();
const localStorage_foodMeshStoreCodes = "foodMeshStoreCodes"; 

let storeNameAutoComplete: Listener[];

// Load options from local storage
{
    const storedOptions: string[] = localStorage.getItem(localStorage_storeNames).split(",");
    if (storedOptions) {
        storeNames = storedOptions;
        csvDataTextarea.value = storedOptions.join(",");
    }

    const storeToFoodMeshCodes: string[] = localStorage.getItem(localStorage_foodMeshStoreCodes)?.split(",");
    if (storeToFoodMeshCodes) {
        for (let i = 0; i < storeToFoodMeshCodes.length; i) {
            const store = storeToFoodMeshCodes[i++];
            const foodMeshName = storeToFoodMeshCodes[i++];            
            storeFoodMeshCodes.set(store, { foodMeshName })
        }
    }
}

function updateStoreAutoComplete() {
    storeNameAutoComplete = Autocomplete.autocomplete(
        storeName,
        storeNames,
        5,
        "storeNames",
        false    
    );
}
updateStoreAutoComplete();

// Handle textarea change
csvDataTextarea.addEventListener("change", (e) => {
    // Get CSV data
    const csvData = csvDataTextarea.value;

    // Parse CSV data
    let storeNames_csv = csvData.split(",");
    //storeNames formatting
    storeNames = storeNames_csv.map((x) => {
        x = x.trim();
        return x;
    });

    // Store storeNames in local storage
    localStorage.setItem(localStorage_storeNames, storeNames.join(","));
    storeNameAutoComplete = Autocomplete.removeAutocomplete(storeNameAutoComplete);
    updateStoreAutoComplete();
});

/** 0-indexed */
function getTableRows() {
    return weightsTable.tBodies[0].getElementsByTagName("tr");
}

let table_dataRepresentation: string[][] = [];
const removeRowButton_className = "removeRowButton";
const editButton_className = "editRowButton";
const removeRowButtonHTML = `<button class="${removeRowButton_className}">X</button>`;
const editRowButtonHTML = `<button class="${editButton_className}">Edit</button>`;
function reloadTableFromData() {
    let tableData = "";
    for (const rowData of table_dataRepresentation) {
        tableData += "<tr><td>";
        tableData += rowData.join("</td><td>")
        tableData += `</td></tr>`;
    }
    weightsTable.tBodies[0].innerHTML = tableData;
    
    // HACK: adding the buttons between </td></tr> doesn't work (the button is always after the </tr> when done that way)
    for(let row of weightsTable.tBodies[0].getElementsByTagName("tr")) {
        row.innerHTML += `<td>${editRowButtonHTML}${removeRowButtonHTML}</td>`
    }
    
    const removeButtons: HTMLCollectionOf<HTMLButtonElement> = document.getElementsByClassName(removeRowButton_className) as HTMLCollectionOf<HTMLButtonElement>;
    let buttonRow = 0;
    for(let button of removeButtons){
        const buttonRow_index = buttonRow++;
        button.addEventListener("click", (e) => {
            const row = table_dataRepresentation[buttonRow_index];
            loadRowToInputBoxes(row);
            table_dataRepresentation.splice(buttonRow_index, 1)
            reloadTableFromData();
        });
    }

    const editButtons: HTMLCollectionOf<HTMLButtonElement> = document.getElementsByClassName(editButton_className) as HTMLCollectionOf<HTMLButtonElement>;
    buttonRow = 0;
    for(let button of editButtons){
        const buttonRow_index = buttonRow++;
        button.addEventListener("click", (e) => {
            editRow(buttonRow_index);
        });
    }
}

const editModeColor_cssClass = "editModeColor";
const rowsBeingEdited: number[] = [];


function reloadRowEditCss() {
    const rows = getTableRows();
    for (const rowNumber of rowsBeingEdited) {
        rows[rowNumber].classList.add(editModeColor_cssClass)   
    }
}

function editRow(rowNumber: number) {
    if(rowsBeingEdited.includes(rowNumber)){
        return;
    }
    
    if(rowsBeingEdited.length == 0) {
        loadRowToInputBoxes(table_dataRepresentation[rowNumber])
        form.classList.add(editModeColor_cssClass)
        submitButton.value = "End Edit"
    }
    
    rowsBeingEdited.push(rowNumber);    
    const rowHTML = getTableRows()[rowNumber];
    rowHTML.classList.add(editModeColor_cssClass)     
}

function endEdit() {
    const rows = getTableRows();
    
    form.classList.remove(editModeColor_cssClass)
    submitButton.value = "Submit"
    
    for (const row of rows) {
        row.classList.remove(editModeColor_cssClass)   
    }
    
    rowsBeingEdited.length = 0;    
}


function editUpdate(columnNumber: number, data: string) {    
    for (let i = 0; i < rowsBeingEdited.length; i++) {
        table_dataRepresentation[rowsBeingEdited[i]][columnNumber] = data;        
    }
    reloadTableFromData();
    reloadRowEditCss();
}


const foodTypes: string[] = [];
{
    const options = foodTypeSelect.querySelectorAll('input[type=radio]') as NodeListOf<HTMLInputElement>;
    for (let option of options) {
        foodTypes.push(option.value);
    }
}

function loadRowToInputBoxes(row: string[]) {   
    let i = 0;
    for (const column of headersArray) {
        column.setFormFromColumnData(row[i++]);
    }
}

// TODO: enable reload from csv file
document.getElementById("loadTable").addEventListener("click", (e) => { reloadTableFromData() });
document.getElementById("groupTableData").addEventListener("click", (e) => { groupTableDataAndUpdateTable() });

document.getElementById("loadTableBackup").addEventListener("click", (e) => { loadTableFromLocalStorage() });

document.getElementById("saveTableBackup").addEventListener("click", (e) => { saveTableToLocalStorage(table_dataRepresentation, getTableHeaders()) });

document.getElementById("clearTable").addEventListener("click", (e) => { 
    if (confirm("Do you really want to clear table?\nThis can't be undone.")) {
        table_dataRepresentation = [];
        reloadTableFromData();
        alert("table cleared.");
    }
});

// Handle form submission
const compostSelectedTrueOption = "Yes";

form.addEventListener("submit", (event) => {
    // Prevent default form submission behavior
    event.preventDefault();
    if(rowsBeingEdited.length > 0) {
        endEdit();
        return;
    }


    // if validation fails for any input
    if(headersArray.find((x) => {return !x.validateAndAlertUser()}) !== undefined) { 
        return;
    }

    const formData = getFormValues();

    const row = formData;
    if (row.length != _headerCount) {
        alert("Program Error: invalid header count for submitted data.");
        console.error(new Error(`Invalid header count, got ${row.length} expected ${_headerCount} `));        
        return;
    }

    table_dataRepresentation.push(row);
    reloadTableFromData();

    // reset
    weightInput.value = "0";
    const selectedRadio = foodTypeSelect.querySelector('input[type=radio]:checked') as HTMLInputElement;    
    if (keepLastFoodType.checked == false){
        selectedRadio.checked = false;
    }

    if(keepBinCount.checked == false){
        binCountInput.value = binCountDefaultValue;
    }

    compostSelect.checked = false;
    if (manualWeight.checked) {
        weightInput.value = "";
        weightInput.focus()
    } else {
        compostSelect.focus();
    }

    saveTableToLocalStorage(table_dataRepresentation, getTableHeaders());   
    playAnimation(form, goodSubmitFlash);
});

// TODO: save and load table to local storage for backups
type TableData = [string[], string[][]];
const currentBackupName = document.getElementById("backupName") as HTMLInputElement;
currentBackupName.value = helpers.formatDate(new Date()) + "-foodMesh";
async function saveTableToLocalStorage(rows: string[][], headers: string[]) {
    localforage.setItem<TableData>(currentBackupName.value, [headers, rows])
}

async function loadTableFromLocalStorage() {
    let table: TableData;
    try {
        table = await localforage.getItem<TableData>(currentBackupName.value); 
    } catch (error) {
        console.error(error);
        return;
    }

    if (table == undefined) {
        console.log(`could not load table ${currentBackupName.value} from storage.`);
        return;
    }
    
    table_dataRepresentation = [];
    for (const row of table[1]) {        
        table_dataRepresentation.push(row);
    }
    reloadTableFromData();
}

function backupList() {
    localforage.keys((err, keys) => {
        for (const key of keys) {
            console.log(`table in storage: ${key}`);
        }
    });
}

// TODO: format for the input table in the main document
// TODO: only export non foodMesh stores.
document.getElementById("saveTable").addEventListener("click", (e) => {
    exportToCsv("Data",
        table_dataRepresentation, getTableHeaders());
});

function groupTableData(table_dataRepresentation: string[][]): string[][] {
    let rows: string[][] = [];
    let dataBuckets: Map<string, [bins: number, weight: number]> = new Map();
    const bucketSeparator = "||";
    
    for (const row of table_dataRepresentation) {
        // could use enums for store, date, food type, and compost to improve hashing
        const rowBucket = 
        `${row[headers.date.columnIndex]}${bucketSeparator}`
        +`${row[headers.store.columnIndex]}${bucketSeparator}`
        +`${row[headers.foodType.columnIndex]}${bucketSeparator}`
        +`${row[headers.compost.columnIndex]}`;
        
        if (!dataBuckets.has(rowBucket)) {
            dataBuckets.set(rowBucket, [0, 0]);
        }
        let currentSet = dataBuckets.get(rowBucket);
        let i = 0;
        currentSet[i++] += parseInt(row[headers.weight.columnIndex]);
        currentSet[i++] += parseInt(row[headers.bins.columnIndex]);
        dataBuckets.set(rowBucket, currentSet);
    }

    for (let bucket of dataBuckets) {
        const keys = bucket[0].split(bucketSeparator);
        const row: string[] = [];
        
        // HACK: manually ordered from headers
        let i = 0;
        row.push(keys[i++]);
        row.push(keys[i++]);
        row.push(bucket[1][0].toString());
        row.push(bucket[1][1].toString());
        row.push(keys[i++]);
        row.push(keys[i++]);
        if (_headerCount != i + 2) {
            throw Error("Unexpected header count here.")
        }

        rows.push(row);
    }

    return rows;
}

function groupTableDataAndUpdateTable() {
    table_dataRepresentation = groupTableData(table_dataRepresentation);
    reloadTableFromData();
}

function groupAndExportTableToCsv() {    
    exportToCsv(currentBackupName.value, groupTableData(table_dataRepresentation), Object.keys(headers));
}

function exportToCsv(filename: string, rows: string[][], headers: string[]) {
    if (!rows || !rows.length) {
        return;
    }
    const separator: string = ",";

    const csvContent =
        headers.join(separator) +
        '\n' +
        rows.map(row => {
            return row.join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        // Browsers that support HTML5 download attribute
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


// https://developer.chrome.com/articles/serial/

async function addScalePort() {     
    try {
        await navigator.serial.requestPort(/* get right values example: { usbVendorId: 0x2341, usbProductId: 0x0043 } */);        
        scalePort = await getScaleComPort();
        readAndUpdateWeight(500);
    } catch (error) {
        alert("could not connect to scale error.");         
    }
}

async function getScaleComPort() {
    let ports = await navigator.serial.getPorts();
    if (ports.length == 0) {
        console.warn("no scale port available yet.")
        return null
    } else if (ports.length != 1) {
        console.error("multiple ports active on this page, unable to get scale");
        return null
    }

    let scalePort = ports[0];
    await scalePort.open({
        baudRate: 9600,
        parity: "none",
        stopBits: 1,           
    })
    return scalePort;
}

interface ScaleData {
    STX: string;
    statusBytes: {
        A: number;
        B: number;
        C: number;
    };
    displayedWeight: number;
    tareWeight: number;
    CR: string;
    checksum?: string;
}

let scaleData: ScaleData;
function scaleDataLog() {
    setTimeout(() => {
        console.log(scaleData)
        scaleDataLog();
    }, 1000)
}
//  scaleDataLog();

const scaleDataSize_bytes = 17;
async function readAndUpdateWeight(updateRate_ms: number) {
    if (scalePort?.readable == null) {
        return;
    }

    const reader = scalePort.readable.getReader();
    let currentDataBlock: Uint8Array = new Uint8Array(32);
    let currentIndex = 0;

    enum ScaleReadState {
        WAITING_FOR_STX,
        READING_DATA,
        PROCESSING_DATA
    }
    
    let currentState: ScaleReadState = ScaleReadState.WAITING_FOR_STX;
    // Listen to data coming from the serial device.
    try {
        while (true) {
            const { value, done } = await reader.read();
            for (const byte of value as Uint8Array) {
                if (currentState === ScaleReadState.WAITING_FOR_STX) {
                    if (byte === 2) {
                        currentState = ScaleReadState.READING_DATA;
                        currentDataBlock[currentIndex++] = byte;
                    } 
                    // else {} // data is thrown away                    
                } else if (currentState === ScaleReadState.READING_DATA) {
                    currentDataBlock[currentIndex++] = byte;
                    if (currentIndex > scaleDataSize_bytes) {
                        currentState = ScaleReadState.PROCESSING_DATA;
                    }
                } else if (currentState === ScaleReadState.PROCESSING_DATA) {
                    scaleData = {
                        STX: String.fromCharCode(currentDataBlock[0]),
                        statusBytes: {
                            A: currentDataBlock[1],
                            B: currentDataBlock[2],
                            C: currentDataBlock[3],
                        },
                        displayedWeight: parseInt(String.fromCharCode(...currentDataBlock.slice(4, 10))),
                        tareWeight: parseInt(String.fromCharCode(...currentDataBlock.slice(10, 16))),
                        CR: String.fromCharCode(currentDataBlock[16]),
                        checksum: currentDataBlock.length > 17 ? String.fromCharCode(currentDataBlock[17]) : undefined,
                    };

                    currentIndex = 0;
                    currentState = ScaleReadState.WAITING_FOR_STX;

                    if (!manualWeight.checked)
                        weightInput.value = Math.round((scaleData.displayedWeight * 0.01)).toString();
                }
            }

            if (done) {
                // Allow the serial port to be closed later.
                reader.releaseLock();
                break;
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        reader.releaseLock();
    }

    setTimeout(() => readAndUpdateWeight(updateRate_ms), updateRate_ms);
}

let scalePort = await getScaleComPort();
if (scalePort != null) {
    readAndUpdateWeight(500);
} else {
    alert("Scale not connected, can not get weight automatically");
}

await loadTableFromLocalStorage();