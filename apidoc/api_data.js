define({ "api": [
  {
    "type": "get",
    "url": "/cases/:id",
    "title": "Get information about a case",
    "name": "GetCase",
    "group": "Case",
    "version": "1.0.0",
    "description": "<p>Get Notary's perspective on a case.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>UUID of the case</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "JSON",
            "optional": false,
            "field": "body",
            "description": "<p>Case object in JSON format</p>"
          }
        ]
      }
    },
    "filename": "src/controllers/cases.js",
    "groupTitle": "Case"
  },
  {
    "type": "post",
    "url": "/cases/:id/targets",
    "title": "Add a notification target",
    "name": "PostCaseTarget",
    "group": "Case",
    "version": "1.0.0",
    "description": "<p>Add an additional notification target to an existing case</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>UUID of the case</p>"
          },
          {
            "group": "Parameter",
            "type": "JSON",
            "optional": false,
            "field": "body",
            "description": ""
          }
        ]
      }
    },
    "filename": "src/controllers/cases.js",
    "groupTitle": "Case"
  },
  {
    "type": "put",
    "url": "/cases/:id",
    "title": "Create a new case",
    "name": "PutCase",
    "group": "Case",
    "version": "1.0.0",
    "description": "<p>Inform Notary about a new case.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>UUID of the case</p>"
          },
          {
            "group": "Parameter",
            "type": "JSON",
            "optional": false,
            "field": "body",
            "description": "<p>id: Same with id above<br/> execution_condition: crypto condition to be executed by Notary<br/> expires_at: expiration time<br/> notaries: array of Notary URLs</p>"
          }
        ]
      }
    },
    "filename": "src/controllers/cases.js",
    "groupTitle": "Case"
  },
  {
    "type": "put",
    "url": "/cases/:id/fulfillment",
    "title": "Fulfill a case condition",
    "name": "PutCaseFulfillment",
    "group": "Case",
    "version": "1.0.0",
    "description": "<p>Submit a fulfillment for a case.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>UUID of the case</p>"
          },
          {
            "group": "Parameter",
            "type": "JSON",
            "optional": false,
            "field": "body",
            "description": "<p>type: fulfillment type<br/> signature: fulfillment signature</p>"
          }
        ]
      }
    },
    "filename": "src/controllers/cases.js",
    "groupTitle": "Case"
  },
  {
    "type": "get",
    "url": "/health",
    "title": "Get server health status",
    "name": "GetHealth",
    "group": "Health",
    "version": "1.0.0",
    "description": "<p>This endpoint will perform a quick self-check to ensure the server is still operating correctly.</p>",
    "filename": "src/controllers/health.js",
    "groupTitle": "Health"
  },
  {
    "type": "get",
    "url": "/",
    "title": "Get the server metadata",
    "name": "GetMetadata",
    "group": "Metadata",
    "version": "1.0.0",
    "description": "<p>This endpoint will return server metadata.</p>",
    "filename": "src/controllers/metadata.js",
    "groupTitle": "Metadata"
  }
] });
