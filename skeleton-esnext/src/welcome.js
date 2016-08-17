import {inject} from 'aurelia-framework';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import gql from 'graphql-tag';

export class Welcome {
  heading = 'Welcome to the Aurelia Navigation App!';
  firstName = 'John';
  lastName = 'Doe';
  previousValue = this.fullName;

  scrollable = {
    virtual: true
  };

  constructor() {
    let networkInterface = createNetworkInterface('http://localhost:8080/api/graphql?testMode=true');
    this.client = new ApolloClient({
      networkInterface,
    });

    this.datasource = {
      pageSize: 100,
      serverPaging: true,
      serverFiltering: true,
      serverSorting: true,
      transport: {
        read: this.readData.bind(this)
      },
      schema: {
        data: "data",
        total: "total",
        model: {
          fields: {
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_toTargetOrigin: {type: "number"},
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_toTargetDefault: {type: "number"},
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_DROrigin: {type: "number"},
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_DRDefault: {type: "number"},
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_TargetPriceOrigin: {type: "number"},
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_TargetPriceDefault: {type: "number"},
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_Price: {type: "number"},
            field_principal_globalscenario_driven_target_pricesoutputjbp_1csv_MarketCapbilUSD: {type: "number"},
          }
        }
      }
    };
  }

  // TODO - use await?
  readData(options) {
    console.log(options.data);

    // sorts
    let sorts = (options.data.sort || []).map((sort, index) => {
      return {fieldId: sort.field, ascending: sort.dir === "asc" ? true : false};
    });

    // EnumValue("EQUALS", value = FilterTypes.equalsFilter, description = Some("An Equals filter")),
    // EnumValue("EQUALS_ANY", value = FilterTypes.equalsAnyFilter, description = Some("An EqualsAny filter")),
    // EnumValue("EMPTY", value = FilterTypes.emptyFilter, description = Some("Filters on values that are not empty")),
    // EnumValue("RANGE", value = FilterTypes.rangeFilter, description = Some("A Range filter")),
    // EnumValue("SUBSTRING", value = FilterTypes.substringFilter, description = Some("A Substring filter"))

    // filters
    let filters = [];
    if (options.data.filter && options.data.filter.filters) {
      filters = options.data.filter.filters.map((filter, index) => {
        let filterType,
          negate = false;
        switch (filter.operator) {
          case "eq":
            filterType = "EQUALS";
            break;
          case "neq":
            filterType = "EQUALS";
            negate = true;
            break;
          case "isempty":
            filterType = "EMPTY";
            break;
          case "isnotempty":
            filterType = "EMPTY";
            negate = true;
            break;
          case "contains":
            filterType = "SUBSTRING";
            break;
          case "gte":
            filterType = "RANGE";
            break;
          case "gt":
        }
        // type: RANGE,
        //   fieldId: "b4ed1a07-839c-4fd9-8b04-5bca509ef269",
        //   min: "80",
        //   max: "90"


        // currently we need to convert all values to string (app-middleware schema constraint)
        let value = typeof filter.value === 'string' ? filter.value : filter.value.toString();
        if (filter.operator === 'gte') {
          return {type: filterType, fieldId: filter.field, min: value};
        }
        return {type: filterType, fieldId: filter.field, value: value, negate: negate};
      });

      // TODO combine min and max on RANGE filters
    }

    this.client.query({
      query: gql`
        query DataQuery($size: Long = 100, $start: Long = 0, $filters: [filter!], $sorts: [sort!]) {
          data(
            dataSetId: "dataset_principal_globalscenario_driven_target_pricesoutputjbp_1csv",
            start: $start,
            size:  $size,
            modifiers: [{
              filters: $filters,
              sorts: $sorts
            }]           
          ) {
            rows {
              values
            }
            fields {
              id
              name
              fieldType
            }
            totalSize
          }          
        }`,
      variables: {
        size: options.data.take,
        start: options.data.skip,
        filters: filters,
        sorts: sorts
      },
      forceFetch: false,
    }).then(({ data }) => {
      console.log('got data', data);
      let rows = data.data.rows;
      let fields = data.data.fields;
      let fieldCount = data.data.fields.length;
      let i;

      let processedData = (rows || []).map((row, index) => {
        i = fieldCount;
        let result = {};
        while (i--) {
          // TODO - add leading underscore to field names?
          result[fields[i].id] = row.values[i];
        }
        result._rowIndex = index;
        return result;
      });

      let retVal = {};
      retVal['data'] = processedData;
      retVal['total'] = data.data.totalSize;
      options.success(retVal);
    }).catch((error) => {
      console.log('there was an error sending the query', error);
    });
  }

  //Getters can't be directly observed, so they must be dirty checked.
  //However, if you tell Aurelia the dependencies, it no longer needs to dirty check the property.
  //To optimize by declaring the properties that this getter is computed from, uncomment the line below
  //as well as the corresponding import above.
  //@computedFrom('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  submit() {
    this.previousValue = this.fullName;
    alert(`Welcome, ${this.fullName}!`);
  }

  canDeactivate() {
    if (this.fullName !== this.previousValue) {
      return confirm('Are you sure you want to leave?');
    }
  }
}

export class UpperValueConverter {
  toView(value) {
    return value && value.toUpperCase();
  }
}
