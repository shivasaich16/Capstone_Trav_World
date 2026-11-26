export function errorHandler(error,_req,res,_next) {
  console.error(error);
  res.status(500).json({error:process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : error.message});
}
