/*==================================================
 *  Exhibit.RemoteListFacet
 *==================================================
 */

Exhibit.RemoteListFacet = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    
    this._valueSet = new Exhibit.Set();
    
    this._settings = {};
    this._dom = null;
    this._database = null;
};

Exhibit.RemoteListFacet._instances = [];

Exhibit.RemoteListFacet._settingSpecs = {
    "remoteFacetId":    { type: "number" }, 
    "facetLabel":       { type: "text" },
    "fixedOrder":       { type: "text" },
    "sortMode":         { type: "text", defaultValue: "value" },
    "sortDirection":    { type: "text", defaultValue: "forward" },
    "scroll":           { type: "boolean", defaultValue: true },
    "height":           { type: "text" },
    "collapsible":      { type: "boolean", defaultValue: false },
    "collapsed":        { type: "boolean", defaultValue: false },
    "selectMultiple":   { type: "boolean", defaultValue: false},
    "sourceUrl":        { type: "text" },
    "sourceUrlType":    { type: "text", defaultValue: "application/json" },
    "sourceExpression": { type: "text" },
    "queryParamName":   { type: "text", defaultValue: "args" },
    "queryParamSeparator": { type: "text", defaultValue: "," }
};

Exhibit.RemoteListFacet.create = function(configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    
    var remoteFacetId = configuration.remoteFacetId;
    if (remoteFacetId != null && 
        remoteFacetId.length > 0 && 
        Exhibit.RemoteListFacet._instances.length > 0 && 
        remoteFacetId < Exhibit.RemoteListFacet._instances.length) {
          facet = Exhibit.RemoteListFacet._instances[remoteFacetId];
          facet._uiContext = uiContext;
          return facet;
    }
    
    var facet = new Exhibit.RemoteListFacet(containerElmt, uiContext);
    
    Exhibit.RemoteListFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.RemoteListFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
  
    var remoteFacetId = Exhibit.getAttribute(configElmt, "remoteFacetId");
    if (remoteFacetId != null && 
        remoteFacetId.length > 0 && 
        Exhibit.RemoteListFacet._instances.length > 0 && 
        remoteFacetId < Exhibit.RemoteListFacet._instances.length) {
          var facet = Exhibit.RemoteListFacet._instances[remoteFacetId];
          facet._uiContext = uiContext;
          return facet;
    }

    var facet = new Exhibit.RemoteListFacet(containerElmt !== null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.RemoteListFacet._settingSpecs, facet._settings);

    try {
        var sourceUrl = Exhibit.getAttribute(configElmt, "sourceUrl");
        if (sourceUrl != null && sourceUrl.length > 0) {
            facet._settings.sourceUrl = sourceUrl;
        }
        
        var sourceUrlType = Exhibit.getAttribute(configElmt, "sourceUrlType");
        if (sourceUrlType != null && sourceUrlType.length > 0) {
            facet._settings.sourceUrlType = sourceUrlType;
        }
        
        var sourceExpression = Exhibit.getAttribute(configElmt, "sourceExpression");
        if (sourceExpression != null && sourceExpression.length > 0) {
            facet._settings.sourceExpression = Exhibit.ExpressionParser.parse(sourceExpression);
        }
        
        var queryParamName = Exhibit.getAttribute(configElmt, "queryParamName");
        if (queryParamName != null && queryParamName.length > 0) {
            facet._settings.queryParamName = queryParamName;
        }
        
        var queryParamSeparator = Exhibit.getAttribute(configElmt, "queryParamSeparator");
        if (queryParamSeparator != null && queryParamSeparator.length > 0) {
            facet._settings.queryParamSeparator = queryParamSeparator;
        }
        
        var selection = Exhibit.getAttribute(configElmt, "selection", ";");
        if (selection != null && selection.length > 0) {
            for (var i = 0, s; s = selection[i]; i++) {
                facet._valueSet.add(s);
            }
        }
        
    } catch (e) {
        SimileAjax.Debug.exception(e, "RemoteListFacet: Error processing configuration of remote list facet");
    }
    Exhibit.RemoteListFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.RemoteListFacet._configure = function(facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.RemoteListFacet._settingSpecs, facet._settings);
    
    Exhibit.RemoteListFacet._instances.push(facet);
    facet._remoteFacetId = Exhibit.RemoteListFacet._instances.length-1;
    facet._div.setAttribute("ex:remoteFacetId", Exhibit.RemoteListFacet._instances.length-1);
    
    if ("sourceUrl" in configuration) {
        facet._settings.sourceUrl = configuration.sourceUrl;
    }
    
    if ("sourceUrlType" in configuration) {
        facet._settings.sourceUrlType = configuration.sourceUrlType;
    }
    
    if ("sourceExpression" in configuration) {
        facet._settings.sourceExpression = Exhibit.ExpressionParser.parse(configuration.sourceExpression);
    }
    
    if ("queryParamName" in configuration) {
        facet._settings.queryParamName = configuration.queryParamName;
    }
    
    if ("queryParamSeparator" in configuration) {
        facet._settings.queryParamSeparator = configuration.queryParamSeparator;
    }

    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0; i < selection.length; i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    
    if ("fixedOrder" in facet._settings) {
        var values = facet._settings.fixedOrder.split(";");
        var orderMap = {};
        for (var i = 0; i < values.length; i++) {
            orderMap[values[i].trim()] = i;
        }
        
        facet._orderMap = orderMap;
    }
    
    if ("colorCoder" in facet._settings) {
        facet._colorCoder = facet._uiContext.getExhibit().getComponent(facet._settings.colorCoder);
    }
    
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
    
    var fItemUpdate = function() {
      if (facet._database !== null && facet._database.getAllItems().size() > 0) {
        facet._dom.valuesContainer.style.display = "none";
        facet._dom.valuesContainer.innerHTML = "";
        facet._constructBody(facet._computeFacet(facet._database.getAllItems()));
        facet._dom.valuesContainer.style.display = "block"; 
      }
    };
    
    facet._database = Exhibit.Database.create();
    facet._database.addListener({onAfterLoadingItems: fItemUpdate});
    facet._database._loadLinks([{href: facet._settings.sourceUrl, type: facet._settings.sourceUrlType}], facet._database, null);
};

Exhibit.RemoteListFacet.prototype.dispose = function() {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext = null;
    this._colorCoder = null;
    
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    
    this._valueSet = null;
    this._settings = null;
};

Exhibit.RemoteListFacet.prototype.hasRestrictions = function() {
    return false;
};

Exhibit.RemoteListFacet.prototype.clearAllRestrictions = function() {
    var restrictions = { selection: [] };
    if (this._valueSet.size() > 0) {
        this._valueSet.visit(function(v) {
            restrictions.selection.push(v);
        });
        this._valueSet = new Exhibit.Set();
        this.updateFacet();
    }
    return restrictions;
};

Exhibit.RemoteListFacet.prototype.applyRestrictions = function(restrictions) {
    this._valueSet = new Exhibit.Set();
    for (var i = 0; i < restrictions.selection.length; i++) {
        this._valueSet.add(restrictions.selection[i]);
    }
    this.updateFacet();
};

Exhibit.RemoteListFacet.prototype.setSelection = function(value, selected) {
    if (selected) {
        this._valueSet.add(value);
    } else {
        this._valueSet.remove(value);
    }
};

Exhibit.RemoteListFacet.prototype.restrict = function(items) {
  // do nothing
};

Exhibit.RemoteListFacet.prototype.update = function() {
  // do nothing
};

Exhibit.RemoteListFacet.prototype.updateFacet = function() {
  if (this._database !== null && this._database.getAllItems().size() > 0) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    this._updateMainDataSource();
    this._constructBody(this._computeFacet(this._database.getAllItems()));
    this._dom.valuesContainer.style.display = "block"; 
  }
};

// Update the Exhibit data source based on the selected values in the Remote List Facet
Exhibit.RemoteListFacet.prototype._updateMainDataSource = function() {
  var facet = this;
  
  // Create a function to update an individual link
  var updateLink = function(link, value){
    // Setup regular expression
    var queryMatch = '^' + facet._settings.queryParamName;
    var regExp = new RegExp(queryMatch);
    
    // Disect link & remove existing param/value pair
    var linkParts = link.split('?');
    if (linkParts.length > 1) {
      var queryParams = linkParts[1];
      var queryParts = queryParams.split('&');
      var newQueryParts = [];
      var paramAdded = false;
      $.each(queryParts, function(){
        if (this.match(regExp)) {
          newQueryParts.push(facet._settings.queryParamName + '=' + value);
          paramAdded = true;
        }
        else {
          newQueryParts.push(this);
        }
      });
      if (!paramAdded) {
        newQueryParts.push(facet._settings.queryParamName + '=' + value);
      }
      return [linkParts[0], '?', newQueryParts.join('&')].join('');
    }
    else {
      return [link, '?', facet._settings.queryParamName, '=', value].join('');
    }
  };

  
  // Update all of the data links on the page
  var heads = document.documentElement.getElementsByTagName("head");
  for (var h = 0; h < heads.length; h++) {
      var linkElmts = heads[h].getElementsByTagName("link");
      for (var l = 0; l < linkElmts.length; l++) {
          var link = linkElmts[l];
          if (link.rel.match(/\bexhibit\/data\b/)) {
              link.href = updateLink(link.href, this._valueSet.toArray().join(facet._settings.queryParamSeparator));
          }
      }
  }
  
  // Provide a function to update the exhibit after the new dataset has been loaded
  var fDone = function() {
      window.exhibit = Exhibit.create();
      window.exhibit.configureFromDOM();
  };
  
  // Here we just replace the database with a brand new one
  // and load it with our updated data source links
  window.database = Exhibit.Database.create();
  window.database.loadDataLinks(fDone);
};

Exhibit.RemoteListFacet.prototype._computeFacet = function(items) {
    var values = this._settings.sourceExpression.evaluate({'value': items}, {value: 'item'}, 'value', this._database);
    var entries = [];
    
    if (values.size > 0) {
        var valArray = values.values.toArray();
        var selection = this._valueSet;
            
        for (var i = 0; i < valArray.length; i++) {
          entries.push({selectionLabel: valArray[i], actionLabel: valArray[i], value: valArray[i], selected: selection.contains(valArray[i])});
        }
        
        entries.sort(this._createSortFunction(values.valueType));
    }
    
    return entries;
};

Exhibit.RemoteListFacet.prototype._initializeUI = function() {
    var self = this;
    this._dom = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetFrame" : "constructFlowingFacetFrame"](
		this,
        this._div,
        this._settings.facetLabel,
        function(elmt, evt, target) { self._clearSelections(); },
        this._uiContext,
        this._settings.collapsible,
        this._settings.collapsed
    );
    
    if ("height" in this._settings && this._settings.scroll) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};

Exhibit.RemoteListFacet.prototype._constructBody = function(entries) {
    var self = this;
    var containerDiv = this._dom.valuesContainer;
    
    containerDiv.style.display = "none";
    
    var facetHasSelection = this._valueSet.size() > 0;
    var constructValue = function(entry) {
        var onSelect = function(elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onSelectOnly = function(elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var elmt = Exhibit.RemoteListFacet.constructFacetItem(
            entry.selectionLabel, 
            (self._colorCoder != null) ? self._colorCoder.translate(entry.value) : null,
            entry.selected, 
            self._settings.selectMultiple,
            facetHasSelection,
            onSelect,
            onSelectOnly,
            self._uiContext
        );
        
        containerDiv.appendChild(elmt);
    };
    
    for (var j = 0; j < entries.length; j++) {
        constructValue(entries[j]);
    }
    containerDiv.style.display = "block";
    
    this._dom.setSelectionCount(this._valueSet.size());
};

Exhibit.RemoteListFacet.prototype._filter = function(value, label, selectOnly) {
    var self = this;
    var selected, select, deselect;
    
    var oldValues = new Exhibit.Set(this._valueSet);
    
    var newValues;
    var actionLabel;
    
    var wasSelected;
    var wasOnlyThingSelected;

    if (value != null) {
        wasSelected = oldValues.contains(value);
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 1) ;
        
        if (selectOnly) {
            newValues = new Exhibit.Set();
            
            if (!oldValues.contains(value)) {
                newValues.add(value);
            } else if (oldValues.size() > 1) {
                newValues.add(value);
            }
        } else {
            newValues = new Exhibit.Set(oldValues);
            if (newValues.contains(value)) {
                newValues.remove(value);
            } else {
                newValues.add(value);
            }
        }
    }
    
    var newRestrictions = { selection: newValues.toArray() };
    var oldRestrictions = { selection: oldValues.toArray() };
    
    SimileAjax.History.addLengthyAction(
        function() { self.applyRestrictions(newRestrictions); },
        function() { self.applyRestrictions(oldRestrictions); },
        (selectOnly && !wasOnlyThingSelected) ?
            String.substitute(
                Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"],
                [ label, this._settings.facetLabel ]) :
            String.substitute(
                Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"],
                [ label, this._settings.facetLabel ])
    );
};

Exhibit.RemoteListFacet.prototype._clearSelections = function() {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() { state.restrictions = self.clearAllRestrictions(); },
        function() { self.applyRestrictions(state.restrictions); },
        String.substitute(
            Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"],
            [ this._settings.facetLabel ])
    );
};

Exhibit.RemoteListFacet.prototype._createSortFunction = function(valueType) {
    var sortValueFunction = function(a, b) { return a.selectionLabel.localeCompare(b.selectionLabel); };
    if ("_orderMap" in this) {
        var orderMap = this._orderMap;
        
        sortValueFunction = function(a, b) {
            if (a.selectionLabel in orderMap) {
                if (b.selectionLabel in orderMap) {
                    return orderMap[a.selectionLabel] - orderMap[b.selectionLabel];
                } else {
                    return -1;
                }
            } else if (b.selectionLabel in orderMap) {
                return 1;
            } else {
                return a.selectionLabel.localeCompare(b.selectionLabel);
            }
        };
    } else if (valueType == "number") {
        sortValueFunction = function(a, b) {
            a = parseFloat(a.value);
            b = parseFloat(b.value);
            return a < b ? -1 : a > b ? 1 : 0;
        };
    }
    
    var sortFunction = sortValueFunction;
    if (this._settings.sortMode == "count") {
        sortFunction = function(a, b) {
            var c = b.count - a.count;
            return c != 0 ? c : sortValueFunction(a, b);
        };
    }

    var sortDirectionFunction = sortFunction;
    if (this._settings.sortDirection == "reverse"){
        sortDirectionFunction = function(a, b) {
            return sortFunction(b, a);
        };
    }
    
    return sortDirectionFunction;
};

// Exhibit.RemoteListFacet.prototype.exportSettings = function() {
//   var s = [];
//   this._valueSet.visit(function(v) {
//     s.push(v);
//   });
//   if (s.length > 0)
//     return '["' + s.join('","') + '"]';
// };
// 
// Exhibit.RemoteListFacet.prototype.importSettings = function(settings) {
//   var self = this;
//   
//   self.applyRestrictions({ selection: settings });
// }

Exhibit.RemoteListFacet.constructFacetItem = function(
    label,  
    color,
    selected, 
    selectMultiple,
    facetHasSelection,
    onSelect,
    onSelectOnly,
    uiContext
) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    
    var dom = SimileAjax.DOM.createDOMFromString(
        "div",
        "<div class='exhibit-facet-value-inner' id='inner'>" + 
            (selectMultiple ? ("<div class='exhibit-facet-value-checkbox'>&#160;" +
                    SimileAjax.Graphics.createTranslucentImageHTML(
                        Exhibit.urlPrefix + 
                        (   facetHasSelection ?
                            (selected ? "images/black-check.png" : "images/no-check.png") :
                            "images/no-check-no-border.png"
                        )) +
                "</div>"
            ) : '') +
            "<a class='exhibit-facet-value-link' href='javascript:{}' id='link'></a>" +
        "</div>"
    );
    dom.elmt.className = selected ? "exhibit-facet-value exhibit-facet-value-selected" : "exhibit-facet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.link.innerHTML = label;
        if (color != null) {
            dom.link.style.color = color;
        }
    } else {
        dom.link.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection && selectMultiple) {
        SimileAjax.WindowManager.registerEvent(dom.inner.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    return dom.elmt;
}; 