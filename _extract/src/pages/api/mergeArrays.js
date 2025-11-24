export default function handler(req, res) {
    const { arr1, arr2 } = req.body;
    
    const merged = arr1.reduce((acc, obj) => {
      acc[obj.id] = { ...acc[obj.id], ...obj };
      return acc;
    }, {});
    
    arr2.forEach(obj => {
      if (merged[obj.id]) {
        merged[obj.id] = { ...merged[obj.id], ...obj };
      } else {
        merged[obj.id] = obj;
      }
    });
    
    const result = Object.values(merged);
    res.status(200).json({ result });
  }
  