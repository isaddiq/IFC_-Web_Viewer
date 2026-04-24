    // ====== 공통 유틸 ======
function __esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// web-ifc 참조(값/타입)로 오는 항목을 실제 객체로 해제
function __getLineSafe(p) {
  if (!p) return null;
  if (p.Name) return p; // 이미 해제됨
  if (p.value != null && p.type) {
    const modelID = window.getActiveModelId?.();
    if (modelID == null) return null;
    try { return ifcLoader.ifcManager.state.api.GetLine(modelID, p.value, true); }
    catch (e) { return null; }
  }
  return null;
}

// 값/단위 추출 (NominalValue 우선)
function __extractValueAndUnit(propLine) {
  const nv = propLine?.NominalValue;
  let value = nv?.value ?? propLine?.[propLine?.type]?.value ?? propLine?.value ?? '';

  if (typeof value === 'number') {
    const s = value.toString();
    value = s.length > 14 ? Number(value.toFixed(6)) : value;
  }
  const unit =
    propLine?.Unit?.Name?.value ||
    propLine?.Unit?.value ||
    propLine?.Unit ||
    '';
  return { value, unit };
}

// 표 HTML 빌더
function __buildTableHTML(title, rows) {
  if (!rows?.length) return '';
  const trs = rows.map(r => `
    <tr>
      <td>${__esc(r.name)}</td>
      <td>${r.value == null || r.value === '' ? '<span class="empty-value">(empty)</span>' : __esc(r.value)}</td>
      <td>${r.unit == null || r.unit === '' ? '<span class="empty-value">(empty)</span>' : __esc(r.unit)}</td>
    </tr>`).join('');

  return `
    <h4 style="margin:8px 0 4px;">${__esc(title)}</h4>
    <table class="pset-table" style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:4px 6px;">Property</th>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:4px 6px;">Value</th>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:4px 6px;">Unit</th>
        </tr>
      </thead>
      <tbody>
        ${trs}
      </tbody>
    </table>`;
}

// “Dimensions” + 원하는 "Other"만 렌더링(Other가 여러 개면 규칙에 따라 1개 선택)
function renderOtherAndDimensions(prpsets) {
  const mount = document.getElementById('psetTables');
  if (!mount) return;
  mount.innerHTML = '';

  // 이름별로 Pset 모으기
  const byName = new Map();
  for (const p of (prpsets || [])) {
    const name = p?.Name?.value || '';
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(p);
  }

  // --- Dimensions: 있으면 전부 혹은 첫 번째만 (보통 1개) ---
  const dims = byName.get('Dimensions') || [];
  if (dims.length) {
    for (const d of dims.slice(0, 1)) { // 여러 개면 첫 번째만
      const propsArr = (d.HasProperties || []).map(__getLineSafe).filter(Boolean);
      const rows = propsArr.map(p => {
        const nm = p?.Name?.value ?? '';
        const { value, unit } = __extractValueAndUnit(p);
        return { name: nm, value, unit };
      }).filter(r => r.name);
      const html = __buildTableHTML('Dimensions', rows);
      if (html) mount.insertAdjacentHTML('beforeend', html);
    }
  }

  // --- Other: 여러 개면 "두 번째" 또는 "특정 키가 있는 것"만 선택 ---
  const others = byName.get('Other') || [];
  if (others.length) {
    // 1) 우선순위: 특정 키가 들어있는 Other (KBIMS-부위코드 / 조달청표준공사코드 / Family Name)
    const hasTargetKeys = (pset) => {
      const propsArr = (pset.HasProperties || []).map(__getLineSafe).filter(Boolean);
      const keys = new Set(propsArr.map(p => p?.Name?.value));
      return (
        keys.has('KBIMS-부위코드') ||
        keys.has('조달청표준공사코드') ||
        keys.has('Family Name')
      );
    };
    let selected = others.find(hasTargetKeys);

    // 2) 없으면 "두 번째 Other" 사용 (요구사항)
    if (!selected && others.length >= 2) {
      selected = others[1];
    }

    // 3) 그래도 없으면 마지막걸 사용(폴백)
    if (!selected) {
      selected = others[others.length - 1];
    }

    if (selected) {
      const propsArr = (selected.HasProperties || []).map(__getLineSafe).filter(Boolean);
      const rows = propsArr.map(p => {
        const nm = p?.Name?.value ?? '';
        const { value, unit } = __extractValueAndUnit(p);
        return { name: nm, value, unit };
      }).filter(r => r.name);
      const html = __buildTableHTML('Other', rows);
      if (html) mount.insertAdjacentHTML('beforeend', html);
    }
  }

}
    
    
    // 현재 마우스 위치 알아내기
function __normaliseList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function __lineDisplayLabel(line) {
  if (!line || typeof line !== 'object') return '';
  const parts = [];
  const name =
    line?.Name?.value ||
    line?.LongName?.value ||
    line?.LayerName?.value ||
    line?.GlobalId?.value;
  if (name) parts.push(name);
  if (line.type) parts.push(line.type);
  if (line.expressID != null) parts.push(`#${line.expressID}`);
  return parts.join(' • ');
}

function __isInlineIfcValue(value) {
  if (value == null) return true;
  if (typeof value !== 'object') return true;
  if (Array.isArray(value)) return value.every(__isInlineIfcValue);
  if (
    Object.prototype.hasOwnProperty.call(value, 'value') &&
    (value.value == null || typeof value.value !== 'object')
  ) {
    return true;
  }
  const keys = Object.keys(value).filter((key) => typeof value[key] !== 'function');
  return keys.length <= 2 && keys.includes('type') && keys.includes('expressID');
}

function __stringifyIfcValue(value, depth = 0) {
  if (value == null) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return '';
    return value
      .map((item) => __stringifyIfcValue(item, depth + 1))
      .join(', ');
  }
  if (typeof value === 'object') {
    if (
      Object.prototype.hasOwnProperty.call(value, 'value') &&
      (value.value == null || typeof value.value !== 'object')
    ) {
      return String(value.value);
    }
    if (depth > 0) {
      return __lineDisplayLabel(value);
    }
  }
  return '';
}

function __dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.name}|${row.value}|${row.unit}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function __flattenIfcObject(value, prefix = '', rows = [], seen = new WeakSet(), depth = 0, options = {}) {
  const maxDepth = options.maxDepth ?? 4;
  const includeCollections = options.includeCollections === true;
  if (depth > maxDepth) return rows;
  if (value == null) {
    if (prefix) rows.push({ name: prefix, value: '', unit: '' });
    return rows;
  }

  if (typeof value !== 'object') {
    if (prefix) rows.push({ name: prefix, value: String(value), unit: '' });
    return rows;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      if (prefix) rows.push({ name: prefix, value: '', unit: '' });
      return rows;
    }
    if (value.every(__isInlineIfcValue)) {
      rows.push({
        name: prefix || 'Value',
        value: value
          .map((item) => __stringifyIfcValue(item, depth + 1))
          .join(', '),
        unit: '',
      });
      return rows;
    }
    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      __flattenIfcObject(item, nextPrefix, rows, seen, depth + 1, options);
    });
    return rows;
  }

  if (seen.has(value)) return rows;
  seen.add(value);

  const ignoreKeys = new Set([
    'mats',
    'geometry',
    'parent',
    'children',
    'HasProperties',
    'HasQuantities',
    'Quantities',
    'HasPropertySets',
  ]);

  for (const [key, nextValue] of Object.entries(value)) {
    if ((ignoreKeys.has(key) && !includeCollections) || typeof nextValue === 'function') {
      continue;
    }
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (__isInlineIfcValue(nextValue)) {
      const text = __stringifyIfcValue(nextValue, depth + 1);
      rows.push({ name: nextPrefix, value: text, unit: '' });
    } else {
      __flattenIfcObject(nextValue, nextPrefix, rows, seen, depth + 1, options);
    }
  }

  return rows;
}

function __getIfcUnit(definition) {
  const unitValue =
    definition?.Unit?.Name?.value ||
    definition?.Unit?.value ||
    definition?.Unit;
  return __stringifyIfcValue(unitValue);
}

function __extractIfcFieldValue(definition) {
  if (!definition || typeof definition !== 'object') return '';

  if (definition.NominalValue != null) {
    return __stringifyIfcValue(definition.NominalValue);
  }
  if (Array.isArray(definition.EnumerationValues)) {
    return definition.EnumerationValues
      .map((item) => __stringifyIfcValue(item))
      .filter(Boolean)
      .join(', ');
  }
  if (Array.isArray(definition.ListValues)) {
    return definition.ListValues
      .map((item) => __stringifyIfcValue(item))
      .filter(Boolean)
      .join(', ');
  }

  const explicitValueKeys = [
    'LengthValue',
    'AreaValue',
    'VolumeValue',
    'CountValue',
    'WeightValue',
    'TimeValue',
    'NumberValue',
    'MassValue',
    'ForceValue',
    'ThermalTransmittanceValue',
    'UpperBoundValue',
    'LowerBoundValue',
    'SetPointValue',
  ];

  for (const key of explicitValueKeys) {
    if (definition[key] != null) {
      return __stringifyIfcValue(definition[key]);
    }
  }

  const genericValueEntries = Object.entries(definition).filter(([key, currentValue]) => {
    if (currentValue == null) return false;
    if (
      key === 'Name' ||
      key === 'Unit' ||
      key === 'Description' ||
      key === 'expressID' ||
      key === 'type' ||
      key === 'HasProperties' ||
      key === 'HasQuantities' ||
      key === 'Quantities'
    ) {
      return false;
    }
    return /(Value|Values)$/.test(key);
  });

  if (genericValueEntries.length) {
    return genericValueEntries
      .map(([key, currentValue]) => `${key}: ${__stringifyIfcValue(currentValue)}`)
      .join(' | ');
  }

  if (definition.Description?.value) {
    return String(definition.Description.value);
  }

  return '';
}

function __rowsFromDefinition(definition) {
  const rows = [];
  const collections = []
    .concat(__normaliseList(definition?.HasProperties))
    .concat(__normaliseList(definition?.Quantities))
    .concat(__normaliseList(definition?.HasQuantities));

  if (!collections.length) {
    return __dedupeRows(__flattenIfcObject(definition));
  }

  for (const entry of collections) {
    const resolved = __getLineSafe(entry) || entry;
    if (!resolved) continue;
    const name =
      resolved?.Name?.value ||
      resolved?.type ||
      (resolved?.expressID != null ? `#${resolved.expressID}` : 'Value');
    const fallbackRows = __flattenIfcObject(resolved)
      .filter((row) => row.name !== 'Name' && row.name !== 'Description' && row.name !== 'Unit')
      .map((row) => `${row.name}: ${row.value}`);
    rows.push({
      name,
      value: __extractIfcFieldValue(resolved) || fallbackRows.join(' | ') || '—',
      unit: __getIfcUnit(resolved),
    });
  }

  return __dedupeRows(rows);
}

function __renderRowsSection(mount, title, rows) {
  const visibleRows = __dedupeRows(rows).filter(
    (row) => row && row.name,
  );
  if (!visibleRows.length) return;
  mount.insertAdjacentHTML('beforeend', __buildTableHTML(title, visibleRows));
}

function __collectTypePropertySets(typeDefs) {
  const collected = [];
  const seen = new Set();
  for (const typeDef of __normaliseList(typeDefs)) {
    for (const entry of __normaliseList(typeDef?.HasPropertySets)) {
      const resolved = __getLineSafe(entry) || entry;
      if (!resolved) continue;
      const key =
        resolved.expressID ??
        `${typeDef?.expressID ?? 'type'}:${resolved?.Name?.value ?? collected.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(resolved);
    }
  }
  return collected;
}

function __getIfcLineTypeName(line) {
  if (!line || line.type == null) return '';
  if (typeof line.type === 'string') return line.type;
  try {
    return ifcLoader.ifcManager.state.api.GetNameFromTypeCode(line.type);
  } catch (_) {
    return String(line.type);
  }
}

function __resolveIfcReference(modelID, value, recursive = false, inverse = false) {
  if (!value) return null;
  if (value.expressID != null || value.GlobalId || value.Name) return value;
  const expressID = value.value ?? value.expressID;
  if (expressID == null) return null;
  try {
    return ifcLoader.ifcManager.state.api.GetLine(
      modelID,
      expressID,
      recursive,
      inverse,
    );
  } catch (_) {
    return null;
  }
}

function __isRelationshipKey(key) {
  return /^(Has|Is|Contained|Connected|Referenced|Provides|Fills|Decomposes|Nests|Declares|Operates|Resource|Controls|Assigned|ObjectTypeOf|Positioned)/.test(
    key,
  );
}

function __isRelationshipLine(line) {
  return __getIfcLineTypeName(line).toUpperCase().startsWith('IFCREL');
}

function __collectRelationSections(modelID, inverseProps) {
  const sections = [];
  const seen = new Set();
  if (!inverseProps || typeof inverseProps !== 'object') return sections;

  for (const [key, value] of Object.entries(inverseProps)) {
    if (!__isRelationshipKey(key)) continue;
    const entries = Array.isArray(value) ? value : [value];
    entries.forEach((entry, index) => {
      const relation = __resolveIfcReference(modelID, entry, true, false) || entry;
      if (!relation || typeof relation !== 'object') return;
      if (!__isRelationshipLine(relation) && !__isRelationshipKey(key)) return;
      const relationType = __getIfcLineTypeName(relation) || 'IFC Relationship';
      const relationID =
        relation.expressID != null ? ` #${relation.expressID}` : '';
      const uniqueKey = `${key}:${relation.expressID ?? index}`;
      if (seen.has(uniqueKey)) return;
      seen.add(uniqueKey);
      sections.push({
        title: `Relation: ${key} | ${relationType}${relationID}`,
        rows: __flattenIfcObject(
          relation,
          '',
          [],
          new WeakSet(),
          0,
          { includeCollections: true, maxDepth: 3 },
        ),
      });
    });
  }

  return sections;
}

function renderFullIfcProperties(context) {
  const mount = document.getElementById('psetTables');
  if (!mount) return;
  mount.innerHTML = '';

  const itemProps = context?.itemProps || null;
  const propertySets = __normaliseList(context?.propertySets);
  const typeDefs = __normaliseList(context?.typeDefs);
  const materialDefs = __normaliseList(context?.materialDefs);
  const inverseProps = context?.inverseProps || null;
  const typePropertySets = __collectTypePropertySets(typeDefs);

  if (itemProps) {
    __renderRowsSection(mount, 'Entity Attributes', __flattenIfcObject(itemProps));
  }

  const renderedPropertySets = new Set();
  for (const propertySet of propertySets) {
    const key =
      propertySet?.expressID ??
      `${propertySet?.Name?.value ?? 'pset'}:${renderedPropertySets.size}`;
    if (renderedPropertySets.has(key)) continue;
    renderedPropertySets.add(key);
    const title =
      propertySet?.Name?.value ||
      propertySet?.type ||
      `Property Set ${renderedPropertySets.size}`;
    __renderRowsSection(mount, title, __rowsFromDefinition(propertySet));
  }

  for (const typeDef of typeDefs) {
    const title = `Type Attributes: ${__lineDisplayLabel(typeDef) || 'Type Definition'}`;
    const rows = __flattenIfcObject(typeDef).filter(
      (row) => !row.name.startsWith('HasPropertySets'),
    );
    __renderRowsSection(mount, title, rows);
  }

  for (const propertySet of typePropertySets) {
    const title =
      `Type Set: ${propertySet?.Name?.value || propertySet?.type || 'Type Property Set'}`;
    __renderRowsSection(mount, title, __rowsFromDefinition(propertySet));
  }

  for (const materialDef of materialDefs) {
    const title = `Material: ${__lineDisplayLabel(materialDef) || 'Material Definition'}`;
    __renderRowsSection(mount, title, __flattenIfcObject(materialDef));
  }

  const relationSections = __collectRelationSections(
    context?.modelID,
    inverseProps,
  );
  if (relationSections.length) {
    for (const section of relationSections) {
      __renderRowsSection(mount, section.title, section.rows);
    }
  } else {
    __renderRowsSection(mount, 'Relations', [
      { name: 'Inverse relationships', value: '', unit: '' },
    ]);
  }

  if (!mount.children.length) {
    mount.innerHTML =
      '<div class="panel-placeholder">No IFC properties available for this element</div>';
  }
}

    var currentMouseMove;
    var clicked_expId;
    document.addEventListener('mousemove', (event) => {
      const ndc = window.getViewerPointerNdc?.(event);
      if (ndc) currentMouseMove = ndc;
    });

    // 현재 터치 위치 알아내기
    var currentTouchMove;
    var touchStartTime;
    function touchEventHandler(event) {
      if (!infoHide.checked) {
        if (event.type == "touchstart") {
          //console.log("touch started")
          // 1초 이상 touch 하고 있어야 정보가 보이고 손을 떼면 정보가 사라짐
          touchStartTime = new Date().getTime();
          setTimeout(function () {
            if (new Date().getTime() - touchStartTime >= 1000) {
              // 화면에서 canvas에 해당되는 것만 터치할 수 있게 함
              const ndc = window.getViewerPointerNdc?.(event);
              if (!ndc) return;
              // 스크린에서 touch 위치 가져오기
              currentTouchMove = ndc;
              click_act(event, currentTouchMove);
              if (window.htmlPsetInfo) window.htmlPsetInfo.classList.add('panel-open');
            }
          }, 1000);
        }
        else if (event.type == "touchend") {
          //console.log("touch ended")
          const modelID = window.getActiveModelId?.();
          if (modelID != null) {
            ifcLoader.ifcManager.removeSubset(modelID, mat);
          }
          if (window.htmlPsetInfo) window.htmlPsetInfo.classList.remove('panel-open');
          clearTimeout();
        }
      }
    }

    document.addEventListener('touchstart', touchEventHandler, { passive: true });
    // touchEventHandler 함수 찢어서 이 안에 각각 넣어보기
    document.addEventListener('touchend', touchEventHandler, { passive: true });

    // raycasting 함수 for laser-controls
    function getPickingRaycaster(entity) {
      var laserPoint = entity;
      let raycaster = laserPoint.components['raycaster'].raycaster;
      return raycaster;
    }

    // click 하는 object highlight 하는 material
    const mat = new MeshLambertMaterial({
      transparent: true,
      opacity: 0.55,
      color: 0x3fb950,
      // depthTest: false,
    });


    //부모 계단 express Id 찾는 함수
function __setTextById(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

async function __safeIfcCall(label, fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.warn(`${label} failed:`, error);
    return fallback;
  }
}

function __openIfcPropertiesPanel() {
  if (window.htmlPsetInfo) {
    window.htmlPsetInfo.classList.add('panel-open');
  } else {
    document.getElementById('rightPanel')?.classList.add('open');
  }
}

function __syncSchemaSelection(expressID, scrollIntoView) {
  document
    .querySelectorAll('.tree-header.selected')
    .forEach((node) => node.classList.remove('selected'));
  const header = document.querySelector(
    `.tree-node[data-express-id="${String(expressID)}"] > .tree-header`,
  );
  if (!header) return;
  header.classList.add('selected');
  if (scrollIntoView) {
    header.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

async function __renderIfcSelection(modelid, expressID, options = {}) {
  const ifc = ifcLoader.ifcManager;
  const propertyID = Number(options.propertyID ?? expressID);
  let type = options.type || '';
  if (!type) {
    try {
      type = ifc.getIfcType(modelid, propertyID);
    } catch (_) {
      type = '';
    }
  }

  if (options.highlight !== false) {
    const highlightIDs = Array.isArray(options.highlightIds) && options.highlightIds.length
      ? options.highlightIds.map(Number).filter(Number.isFinite)
      : [Number(expressID)];
    try {
      ifc.createSubset({
        modelID: modelid,
        ids: highlightIDs,
        material: mat,
        scene: window.scene || scene,
        removePrevious: true,
      });
    } catch (error) {
      console.warn(`Highlight skipped for #${expressID}:`, error);
    }
  }

  const itemProps = await __safeIfcCall(
    'getItemProperties',
    () => ifc.getItemProperties(modelid, propertyID, true),
    null,
  );
  const propertySets = await __safeIfcCall(
    'getPropertySets',
    () => ifc.getPropertySets(modelid, propertyID, true),
    [],
  );
  const typeDefs = await __safeIfcCall(
    'getTypeProperties',
    () => ifc.getTypeProperties(modelid, propertyID, true),
    [],
  );
  const materialDefs = await __safeIfcCall(
    'getMaterialsProperties',
    () => ifc.getMaterialsProperties(modelid, propertyID, true),
    [],
  );
  const inverseProps = await __safeIfcCall(
    'getItemRelations',
    () => ifcLoader.ifcManager.state.api.GetLine(modelid, propertyID, true, true),
    null,
  );

  const name =
    itemProps?.Name?.value ||
    itemProps?.LongName?.value ||
    itemProps?.ObjectType?.value ||
    '';
  const globalId = itemProps?.GlobalId?.value || '';
  const predefined =
    itemProps?.PredefinedType?.value ||
    itemProps?.ObjectType?.value ||
    itemProps?.type ||
    '';

  __setTextById('prpValTypeInfo', `${type || 'IFC Element'} #${propertyID}`);
  __setTextById('prpValCategoryInfo', name || globalId);
  __setTextById('prpValHeightInfo', predefined === name ? globalId : predefined);
  __setTextById('prpValTypeIdInfo', globalId);
  __setTextById('ifcMemoTypeInfo', type);
  clicked_expId = Number(expressID);
  if (typeof setSelectedMemo === 'function') setSelectedMemo(Number(expressID));

  renderFullIfcProperties({
    modelID: modelid,
    itemProps,
    propertySets,
    typeDefs,
    materialDefs,
    inverseProps,
  });

  __syncSchemaSelection(propertyID, options.scrollSchema === true);
  __openIfcPropertiesPanel();
}

window.selectIfcElementByExpressId = async function (expressID, options = {}) {
  const modelid = window.getActiveModelId?.();
  const id = Number(expressID);
  if (modelid == null || !Number.isFinite(id)) return;
  await __renderIfcSelection(modelid, id, {
    highlight: true,
    scrollSchema: options.scrollSchema !== false,
    highlightIds: options.highlightIds,
  });
};

    function GetParentStairId(expid) {
      //자식유무
      let hasChild = false
      for (let stair of stMap.values()) {
        //계단에 자식이 있을 경우 
        if (stair.children != null) {
          //자식 중에 express id가 일치하는 자식을 찾는다
          for (let ch of stair.children) {
            if (ch.expressID == expid) {
              hasChild = true
              //찾으면 부모계단의 expressid를 return
              return stair.expressID;
            }
          }
        }
      }
      // 자식이 없을 경우 본래 expressid를 return
      if (hasChild == false)
        return expid
    }


    // 이 함수 바깥(memo.js)에서 사용하기 위해 전역 변수로 정의 
    let intersects = null;


    // ifc 클릭시 info 보여주는 함수
    async function click_act(e, currentDownMove) {
      const sourceEvent = e?.detail?.mouseEvent || e;
      if (!currentDownMove && !e.target?.hasAttribute("laser-controls")) {
        currentDownMove =
          window.getViewerPointerNdc?.(sourceEvent) || currentMouseMove;
      }
      let raycaster = null;
      if (e.target?.hasAttribute("laser-controls")) {
        raycaster = getPickingRaycaster(e.target);
      }
      else if (e.target?.hasAttribute("cursor")) {
        if (AFRAME.scenes[0].states.indexOf("vr-mode") > -1) {
          return;
        }
        if (!currentDownMove) return;
        raycaster = new THREE.Raycaster();
        let cam = document.querySelector("[camera]").getObject3D('camera');
        raycaster.setFromCamera(currentDownMove, cam);
      }

      if (raycaster == null) {
        if (!currentDownMove) return;
        raycaster = new THREE.Raycaster();
        let cam = document.querySelector("[camera]").getObject3D('camera');
        raycaster.setFromCamera(currentDownMove, cam);
      }

      if (scene != null && raycaster != null) {
        let isects = raycaster.intersectObject(scene)?.filter(o_ => o_.object?.visible == true); // 아직 load되지 않은 object는 클릭되지 않게
        intersects = (isects != null && isects.length > 0) ? isects[0] : null;
      }
      else
        intersects = null;

      // modelid = intersects.object.modelID;
      const modelid = window.getActiveModelId?.();
      if (modelid == null) return;

      if (intersects) {
        const index = intersects.faceIndex;
        const geometry = intersects.object.geometry;
        const ifc = ifcLoader.ifcManager;
        const expid = ifc.getExpressId(geometry, index);
        exIds = [expid];
        let prpsets = await ifc.getPropertySets(modelid, expid, false);
        let types = await ifc.getTypeProperties(modelid, expid, false); // 아래 type이랑 다름
        const type = ifc.getIfcType(modelid, expid);
        let propertyExpId = expid;

        //console.log(type, expid);
        if (typeof setSelectedMemo === 'function') setSelectedMemo(expid);

        // // click한 object higlight
        // if (infoHide.checked == true) {
        //   ifc.createSubset({
        //     modelID: modelid,
        //     ids: exIds,
        //     material: mat,
        //     scene: scene,
        //     removePrevious: true,
        //   });
        // }

        // 객체를 항상 하이라이트하기 위해 조건문을 제거하고 ifc.createSubset 호출
        ifc.createSubset({
           modelID: modelid,
          ids: exIds,
          material: mat,
          scene: scene,
          removePrevious: true,
          });

        // 계단일 경우 부모의 property set을 사용
        if (type == "IFCSTAIR") {
          let pId = GetParentStairId(expid);
          propertyExpId = pId;
          prpsets = await ifc.getPropertySets(modelid, pId, false);
          types = await ifc.getTypeProperties(modelid, pId, false);
        }

        // 프로퍼티셋 보여주는 부분
        var prpValType = '';
        var prpValTypeId = '';
        var prpValCategory = '';
        var prpValHeight = '';
        
        // ifc 정보 memo에 보여주는 부분
        // var prpValName = '';
        var prpValLevel = '';
        var ifcTypeInfo = type;
        // var SpaceMemoInfo = document.getElementById("ifcMemoSpaceInfo");
        var ifcMemoLevelInfo = document.getElementById("ifcMemoLevelInfo");
        var ifcMemoTypeInfo = document.getElementById("ifcMemoTypeInfo");

        try {
        for (let typ_ of types) {
          for (let p_ of typ_.HasPropertySets) {
            let pset = ifcLoader.ifcManager.state.api.GetLine(modelid, p_.value, true);
            if (pset != null)
              prpsets.push(pset);
          }
        }
        for (let pset_ of prpsets) {
          if (pset_.Name == null) continue;

          let nm = pset_.Name.value;
          if (nm == "Other") {
            for (let p_ of pset_.HasProperties) {
              if (p_.Name == null) continue;
              let pnm = p_.Name.value;
              let vnm = p_.NominalValue.value;
              if (pnm == "구조형식") {
                prpValHeight = prpValHeight.concat(`${pnm}\n: ${vnm}`);
              }
            }
          }
          if (nm == "Data") {
            for (let p_ of pset_.HasProperties) {
              if (p_.Name == null) continue;
              //let v = ifcLoader.ifcManager.state.api.GetLine(0, p_.value, true);
              let pnm = p_.Name.value;
              let vnm = p_.NominalValue.value;
              if (pnm == "교체주기") {
                prpValType = prpValType.concat(`${pnm}\n: ${vnm}`);
              }
              if (pnm == "마지막 교체 날짜") {
                prpValTypeId = prpValTypeId.concat(`${pnm}\n: ${vnm}`);
              }
              if (pnm == "마지막 점검 날짜") {
                prpValCategory = prpValCategory.concat(`${pnm}\n: ${vnm}`);
              }
              if (pnm == "제품정보") {
                vnm = vnm.substr(2);
                prpValHeight = prpValHeight.concat(`${pnm}\n: ${vnm.slice(0, -14)}`);
              }
            }
          }
          // if (nm == "Identity Data") {

          //   for (let p_ of pset_.HasProperties) {
          //     if (p_.Name == null) { 
          //       if (p_.value != null && p_.type != null)
          //         p_ = ifcLoader.ifcManager.state.api.GetLine(0, p_.value, true); 
          //       if(p_ == null) continue;
          //     }           
          //     // let v = ifcLoader.ifcManager.state.api.GetLine(0, p_.value, true);
          //     let pnm = p_.Name.value;
          //     let vnm = p_.NominalValue.value;
          //     if (pnm == "Name") {
          //       prpValName = prpValName.concat("공간명: ", `${vnm}`);
          //     }
          //   }
          // }
          if (nm == "Constraints") {

            for (let p_ of pset_.HasProperties) {
              if (p_.Name == null) { 
                if (p_.value != null && p_.type != null)
                  p_ = ifcLoader.ifcManager.state.api.GetLine(modelid, p_.value, true); 
                if(p_ == null) continue;
              }
              let pnm = p_.Name.value;
              let vnm = p_.NominalValue.value;
              if (pnm == "Level") {
                prpValLevel = prpValLevel.concat(`${pnm}\n: ${vnm}`);
              }
            }
          }   
        }
        } catch (error) {
          console.warn('Legacy property summary skipped:', error);
        }
        if (prpValType != null) prpValTypeInfo.textContent = prpValType;
        if (prpValTypeId != null) prpValTypeIdInfo.textContent = prpValTypeId;
        if (prpValCategory != null) prpValCategoryInfo.textContent = prpValCategory;
        if (prpValHeight != null) prpValHeightInfo.textContent = prpValHeight;
        //ifc 정보 memo에 보여주는 부분
        if (prpValLevel !=null) ifcMemoLevelInfo.textContent = prpValLevel;  
        if (ifcTypeInfo != null) ifcMemoTypeInfo.textContent = ifcTypeInfo; 
        clicked_expId = expid; 

        await __renderIfcSelection(modelid, expid, {
          propertyID: propertyExpId,
          type,
          highlight: false,
          scrollSchema: true,
        });

        // Open property panel
        if (window.htmlPsetInfo && window.infoHide?.checked !== false) {
          window.htmlPsetInfo.classList.add('panel-open');
        }

        // 선택한 entity 색상 변경
        const backgroundColorPicker = document.querySelector('#backgroundColorPicker');
        // 여기서 input 에 계속 들어옴. 한번 클릭할때 한번만 들어오게 해야 함 
        // input 이 아닌 다른 게 있는지 확인하거나 createSubset 대신 material만 가져와서 변경할 수 있는지 확인
        backgroundColorPicker.addEventListener('input', () => {
          //console.log("input")
          const selectedColor = backgroundColorPicker.value;
          // material
          const pickColorMat = new MeshLambertMaterial({
            transparent: true,
            opacity: 0.4,
            color: selectedColor,
          });

          const pickColorMatTransparent = new MeshLambertMaterial({
            transparent: true,
            opacity: 0.1,
            color: selectedColor,
          });

          // ifc plate일경우엔 투명도를 주고 싶은데 처음 한번만 실행되고 두번째 바꾸려고 하면 opacity 1로 다시 됨
          if (type == "IFCPLATE") {
            ifc.createSubset({
              modelID: modelid,
              ids: exIds,
              material: pickColorMatTransparent,
              scene: scene,
              removePrevious: true,
            });
          }
          else {
            ifc.createSubset({
              modelID: modelid,
              ids: exIds,
              material: pickColorMat,
              scene: scene,
              removePrevious: true,
            });
          }

          // 되돌리기 버튼 부분. 전체 색깔이 다 되돌려짐. 선택한 부분만 되돌려지지 않음
          var colorResetBttn = document.querySelector("#reset");
          colorResetBttn.addEventListener("click", (e) => {
            ifc.removeSubset(modelid, pickColorMat);
            ifc.removeSubset(modelid, pickColorMatTransparent);
          });
        });
      }    // end if(intersects)
      else {
        // Clicked empty space – close property panel
        if (window.htmlPsetInfo) window.htmlPsetInfo.classList.remove('panel-open');
      }
    }  // end click_act


    AFRAME.registerComponent("cursor_click", {
      init: function () {
        let onClick = async (e) => {
          click_act(e, currentMouseMove);
        };
        if (this.el.hasAttribute("laser-controls")) {
          this.el.addEventListener("triggerdown", async (e) => { await onClick(e) });
        }
        else if (this.el.hasAttribute("cursor")) {
          this.el.addEventListener("click", async (e) => { await onClick(e) });
        }
      }
    });
