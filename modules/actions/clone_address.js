export function actionCloneAddress(selectedIds) {

    var action = function (graph) {

        //console.log('graph before', graph.entities);

        const entities = selectedIds.map(function (selectedID) {
            return graph.entity(selectedID);
        });

        const cloneAddressFromEntity = entities[0];
        const addressHouseNumber = cloneAddressFromEntity.tags['addr:housenumber'];
        const addressHouseName = cloneAddressFromEntity.tags['addr:housename'];
        const addressStreet = cloneAddressFromEntity.tags['addr:street'];
        const addressCity = cloneAddressFromEntity.tags['addr:city'];
        const addressProvince = cloneAddressFromEntity.tags['addr:province'];
        const addressBorough = cloneAddressFromEntity.tags['addr:borough'];
        const addressPostcode = cloneAddressFromEntity.tags['addr:postcode'];
        const addressSource = cloneAddressFromEntity.tags['addr:source'];
        const addressSuburb = cloneAddressFromEntity.tags['addr:suburb'];
        const addressState = cloneAddressFromEntity.tags['addr:state'];
        const addressPlace = cloneAddressFromEntity.tags['addr:place'];
        const addressFull = cloneAddressFromEntity.tags['addr:full'];
        const addressCounty = cloneAddressFromEntity.tags['addr:county'];
        const addressDistrict = cloneAddressFromEntity.tags['addr:district'];
        const addressHamlet = cloneAddressFromEntity.tags['addr:hamlet'];
        const addressSubdistrict = cloneAddressFromEntity.tags['addr:subdistrict'];

        for (let i = 1; i < entities.length; i++) {
          let entity = entities[i];
          const tags = Object.assign({}, entity.tags);
          if (addressHouseNumber) {
            tags['addr:housenumber'] = addressHouseNumber;
          }
          if (addressHouseName) {
            tags['addr:housename'] = addressHouseName;
          }
          if (addressStreet) {
            tags['addr:street'] = addressStreet;
          }
          if (addressCity) {
            tags['addr:city'] = addressCity;
          }
          if (addressProvince) {
            tags['addr:province'] = addressProvince;
          }
          if (addressBorough) {
            tags['addr:borough'] = addressBorough;
          }
          if (addressPostcode) {
            tags['addr:postcode'] = addressPostcode;
          }
          if (addressSource) {
            tags['addr:source'] = addressSource;
          }
          if (addressSuburb) {
            tags['addr:suburb'] = addressSuburb;
          }
          if (addressState) {
            tags['addr:state'] = addressState;
          }
          if (addressPlace) {
            tags['addr:place'] = addressPlace;
          }
          if (addressFull) {
            tags['addr:full'] = addressFull;
          }
          if (addressCounty) {
            tags['addr:county'] = addressCounty;
          }
          if (addressDistrict) {
            tags['addr:district'] = addressDistrict;
          }
          if (addressHamlet) {
            tags['addr:hamlet'] = addressHamlet;
          }
          if (addressSubdistrict) {
            tags['addr:subdistrict'] = addressSubdistrict;
          }
          entity = entity.update({tags});
          graph = graph.replace(entity);
        }

        return graph;
    };

    action.disabled = function (graph) {

        return false;

    };

    action.transitionable = true;

    return action;
}
