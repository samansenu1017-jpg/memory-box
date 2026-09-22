const OWNER_KEY = "XXs7u2ajnpiZ7-K36Cis_2HramSTqRBIZHaPidRzh0HehH06DbeZ_CZQlWpsviZc";
const FOLDER_NAME = 'Our Memory Box';
const STATE_FILE_NAME = 'memory-box-backup.json';

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';
  const key = e && e.parameter ? e.parameter.key : '';
  const callback = e && e.parameter ? e.parameter.callback : '';
  try {
    if (action === 'restore') {
      checkKey_(key);
      const payload = loadState_();
      const result = JSON.stringify({ok:true, payload: payload});
      if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
        return ContentService.createTextOutput(callback + '(' + result + ');')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return json_({ok:true, payload:payload});
    }
    return json_({ok:true, service:'Our Memory Box owner cloud', configured:true});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function doPost(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    checkKey_(p.key);
    if (p.action !== 'save') throw new Error('Unknown action');
    if (!p.payload) throw new Error('Missing backup payload');
    const obj = JSON.parse(p.payload);
    if (!obj || typeof obj !== 'object') throw new Error('Invalid backup payload');
    saveState_(JSON.stringify(obj));
    return json_({ok:true, savedAt:new Date().toISOString()});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function setupOwnerDrive() {
  const folder = getFolder_();
  if (!findStateFile_(folder)) {
    folder.createFile(STATE_FILE_NAME, JSON.stringify({version:1, savedAt:new Date().toISOString(), state:{}}), MimeType.PLAIN_TEXT);
  }
  return {folderId:folder.getId(), folderName:folder.getName()};
}

function checkKey_(key) {
  if (!key || key !== OWNER_KEY) throw new Error('Invalid cloud key');
}

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('MEMORY_BOX_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) {}
  }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('MEMORY_BOX_FOLDER_ID', folder.getId());
  return folder;
}

function findStateFile_(folder) {
  const files = folder.getFilesByName(STATE_FILE_NAME);
  return files.hasNext() ? files.next() : null;
}

function saveState_(payload) {
  const folder = getFolder_();
  const existing = findStateFile_(folder);
  if (existing) {
    existing.setContent(payload);
  } else {
    folder.createFile(STATE_FILE_NAME, payload, MimeType.PLAIN_TEXT);
  }
}

function loadState_() {
  const folder = getFolder_();
  const file = findStateFile_(folder);
  if (!file) throw new Error('No backup exists yet');
  return file.getBlob().getDataAsString('UTF-8');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
